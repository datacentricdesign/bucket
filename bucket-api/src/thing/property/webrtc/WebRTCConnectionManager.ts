// import { WebRtcConnection } from "./WebRTCConnection";
// import { v4 as uuidv4 } from "uuid";
// import { Property } from "../Property";

// export class WebRtcConnectionManager {
//   connections = new Map<string, WebRtcConnection>();
//   closedListeners = new Map();

//   createId(): string {
//     const id = uuidv4();
//     if (!this.connections.has(id)) {
//       return id;
//     }
//     return this.createId();
//   }

//   deleteConnection(connection: WebRtcConnection): void {
//     const closedListener = this.closedListeners.get(connection);
//     this.closedListeners.delete(connection);
//     connection.removeListener("closed", closedListener);
//     this.connections.delete(connection.id);
//   }

//   async createConnection(property: Property): Promise<WebRtcConnection> {
//     // TODO receive thing id/token

//     const id = this.createId();
//     const connection = new WebRtcConnection(id, property);

//     const closedListener = () => {
//       this.deleteConnection(connection);
//     };

//     this.closedListeners.set(connection, closedListener);
//     connection.once("closed", closedListener);

//     this.connections.set(connection.id, connection);

//     await connection.doOffer();
//     return connection;
//   }

//   getConnection(id: string): WebRtcConnection {
//     return this.connections.get(id) || null;
//   }

//   getConnections(): Iterable<WebRtcConnection> {
//     return this.connections.values();
//   }
// }
