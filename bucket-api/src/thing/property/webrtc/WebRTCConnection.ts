import * as wrtc from "wrtc";
import { RTCPeerConnection } from "wrtc";

const RTCAudioSink = wrtc.nonstandard.RTCAudioSink;
const RTCVideoSink = wrtc.nonstandard.RTCVideoSink;
const RTCPeerConnection = wrtc.RTCPeerConnection;

import { PassThrough } from "stream";

import { StreamInput } from "fluent-ffmpeg-multistream";

import * as fs from "fs";

import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import * as ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(ffmpegPath);

let uid = 0;

import { EventEmitter } from "events";
import { Property } from "../Property";
import { Log } from "../../../Logger";
import { PropertyService } from "../PropertyService";
import PropertyController from "../PropertyController";
import config from "../../../config";

const TIME_TO_CONNECTED = 10000;
const TIME_TO_HOST_CANDIDATES = 3000; // NOTE(mroberts): Too long.
const TIME_TO_RECONNECTED = 10000;

export class WebRtcConnection extends EventEmitter {
  peerConnection: RTCPeerConnection;
  connectionTimer = null;
  reconnectionTimer = null;

  id: string;
  state: string;
  property: Property;

  currentPropertyValue: Array<string | number>;

  constructor(id: string, property: Property) {
    super();
    this.id = id;
    this.state = "open";
    this.property = property;

    this.peerConnection = new RTCPeerConnection({
      sdpSemantics: "unified-plan",
    });

    this.beforeOffer(this.peerConnection);

    this.connectionTimer = setTimeout(() => {
      if (
        this.peerConnection.iceConnectionState !== "connected" &&
        this.peerConnection.iceConnectionState !== "completed"
      ) {
        this.close();
      }
    }, TIME_TO_CONNECTED);

    this.peerConnection.addEventListener(
      "iceconnectionstatechange",
      this.onIceConnectionStateChange.bind(this)
    );

    Object.defineProperties(this, {
      iceConnectionState: {
        get() {
          return this.peerConnection.iceConnectionState;
        },
      },
      localDescription: {
        get() {
          return descriptionToJSON(this.peerConnection.localDescription, true);
        },
      },
      remoteDescription: {
        get() {
          return descriptionToJSON(this.peerConnection.remoteDescription);
        },
      },
      signalingState: {
        get() {
          return this.peerConnection.signalingState;
        },
      },
    });
  }

  onIceConnectionStateChange() {
    console.log("onIceConnectionStateChange");
    console.log(this);
    if (
      this.peerConnection.iceConnectionState === "connected" ||
      this.peerConnection.iceConnectionState === "completed"
    ) {
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    } else if (
      this.peerConnection.iceConnectionState === "disconnected" ||
      this.peerConnection.iceConnectionState === "failed"
    ) {
      if (!this.connectionTimer && !this.reconnectionTimer) {
        const self = this;
        this.reconnectionTimer = setTimeout(() => {
          self.close();
        }, TIME_TO_RECONNECTED);
      }
    }
  }

  async doOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    try {
      await waitUntilIceGatheringStateComplete(this.peerConnection);
    } catch (error) {
      this.close();
      throw error;
    }
  }

  async applyAnswer(answer) {
    await this.peerConnection.setRemoteDescription(answer);
  }

  close() {
    console.log("closing connection...");
    this.state = "closed";
    this.emit("closed");
    this.peerConnection.removeEventListener(
      "iceconnectionstatechange",
      this.onIceConnectionStateChange
    );
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
    this.peerConnection.close();
  }

  toJSON() {
    console.log("connection to JSON");
    return {
      id: this.id,
      state: this.state,
      iceConnectionState: this.peerConnection.iceConnectionState,
      localDescription: this.peerConnection.localDescription,
      remoteDescription: this.peerConnection.remoteDescription,
      signalingState: this.peerConnection.signalingState,
    };
  }

  beforeOffer(peerConnection) {
    console.log("before offer");

    const audioTransceiver = peerConnection.addTransceiver("audio");
    const videoTransceiver = peerConnection.addTransceiver("video");

    const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
    const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

    const streams = [];

    videoSink.addEventListener(
      "frame",
      ({ frame: { width, height, data } }) => {
        // TODO keep track of time, every minute? check the validity of the token

        const size = width + "x" + height;
        if (!streams[0] || (streams[0] && streams[0].size !== size)) {
          console.log("only once per stream?");
          uid++;

          const stream = {
            recordPath: "./recording-" + size + "-" + uid + ".mp4",
            size,
            video: new PassThrough(),
            audio: new PassThrough(),
            end: false,
            proc: null,
            recordEnd: false,
          };

          const onAudioData = ({ samples: { buffer } }) => {
            if (!stream.end) {
              stream.audio.push(Buffer.from(buffer));
            }
          };

          audioSink.addEventListener("data", onAudioData);

          stream.audio.on("end", () => {
            audioSink.removeEventListener("data", onAudioData);
          });

          streams.unshift(stream);

          streams.forEach((item) => {
            if (item !== stream && !item.end) {
              item.end = true;
              if (item.audio) {
                item.audio.end();
              }
              item.video.end();
            }
          });

          stream.proc = ffmpeg()
            .addInput(new StreamInput(stream.video).url)
            .addInputOptions([
              "-f",
              "rawvideo",
              "-pix_fmt",
              "yuv420p",
              "-s",
              stream.size,
              "-r",
              "30",
            ])
            .addInput(new StreamInput(stream.audio).url)
            .addInputOptions(["-f s16le", "-ar 48k", "-ac 1"])
            .on("start", () => {
              Log.debug("Start recording >> ", stream.recordPath);
              // Create array property values with start timestamp
              this.currentPropertyValue = [Date.now()];
            })
            .on("end", () => {
              stream.recordEnd = true;
              Log.debug("Stop recording >> ", stream.recordPath);
              // Get end time, calculate duration
              this.currentPropertyValue.push(
                Date.now() - parseInt(this.currentPropertyValue[0].toString())
              );
            })
            // .size(VIDEO_OUTPUT_SIZE)  // To resize the output video, for example '320x240'
            .output(stream.recordPath);

          stream.proc.run();
        }

        streams[0].video.push(Buffer.from(data));
      }
    );

    const { close } = peerConnection;
    const connection = this;
    peerConnection.close = function () {
      audioSink.stop();
      videoSink.stop();

      streams.forEach(({ audio, video, end, proc, recordPath }) => {
        if (!end) {
          if (audio) {
            audio.end();
          }
          video.end();
        }
      });

      let totalEnd = 0;

      const timer = setInterval(() => {
        streams.forEach((stream) => {
          if (stream.recordEnd) {
            totalEnd++;
            if (totalEnd === streams.length) {
              clearTimeout(timer);

              // Change video ouput file name to fit the property-dimension structure
              const outputPath = config.hostDataFolder + "/files/";
              const outputName =
                connection.property.thing.id +
                "-" +
                connection.property.id +
                "-" +
                connection.currentPropertyValue[0] +
                "#video-mp4.mp4";

              const mergeProc = ffmpeg()
                .on("start", () => {
                  Log.debug("Start merging into " + connection.property.id);
                })
                .on("end", () => {
                  streams.forEach(({ recordPath }) => {
                    fs.unlinkSync(recordPath);
                  });
                  Log.debug(
                    "Merge end. You can play " + connection.property.id
                  );
                  // TODO push update property
                  connection.currentPropertyValue.push(outputName);
                  connection.property.values = [
                    connection.currentPropertyValue,
                  ];
                  PropertyController.propertyService.updatePropertyValues(
                    connection.property
                  );
                });

              streams.forEach(({ recordPath }) => {
                mergeProc.addInput(recordPath);
              });

              mergeProc.output(outputPath + outputName).run();
            }
          }
        });
      }, 1000);

      return close.apply(this, arguments);
    };
  }
}

function descriptionToJSON(description, shouldDisableTrickleIce?) {
  return !description
    ? {}
    : {
        type: description.type,
        sdp: shouldDisableTrickleIce
          ? disableTrickleIce(description.sdp)
          : description.sdp,
      };
}

function disableTrickleIce(sdp) {
  return sdp.replace(/\r\na=ice-options:trickle/g, "");
}

async function waitUntilIceGatheringStateComplete(peerConnection) {
  if (peerConnection.iceGatheringState === "complete") {
    return;
  }

  const deferred = { promise: null, resolve: null, reject: null };
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  const timeout = setTimeout(() => {
    peerConnection.removeEventListener("icecandidate", onIceCandidate);
    deferred.reject(new Error("Timed out waiting for host candidates"));
  }, TIME_TO_HOST_CANDIDATES);

  function onIceCandidate({ candidate }) {
    if (!candidate) {
      clearTimeout(timeout);
      peerConnection.removeEventListener("icecandidate", onIceCandidate);
      deferred.resolve();
    }
  }

  peerConnection.addEventListener("icecandidate", onIceCandidate);

  await deferred.promise;
}
