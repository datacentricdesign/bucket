import { MigrationInterface, QueryRunner, getRepository } from "typeorm";
import { Log } from "../../Logger";
import { PropertyType } from "../property/propertyType/PropertyType";

export class MediaTypes1626239384806 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    const propertyTypes: PropertyType[] = [
      {
        id: "VIDEO",
        name: "Video",
        description: "",
        dimensions: [
          {
            id: "video-mp4",
            name: "Video",
            description: "Video file with MP4 encoding.",
            unit: ".mp4",
            type: "video/mp4",
          },
        ],
      },
      {
        id: "AUDIO",
        name: "Audio",
        description: "",
        dimensions: [
          {
            id: "audio-mp3",
            name: "Audio",
            description: "Audio file with MPEG MP3 encoding.",
            unit: ".mp3",
            type: "audio/mpeg",
          },
        ],
      },
      {
        id: "PICTURE",
        name: "Picture",
        description: "",
        dimensions: [
          {
            id: "image-jpg",
            name: "Image",
            description: "Image file with JPEG encoding.",
            unit: ".jpg",
            type: "image/jpeg",
          },
        ],
      },
    ];

    const propertyTypeRepository = getRepository(PropertyType);
    propertyTypes.forEach((type) => {
      propertyTypeRepository
        .findByIds([type.id], {
          relations: ["dimensions"],
        })
        .then((foundTypes) => {
          foundTypes[0].dimensions.push(type.dimensions[0]);
          propertyTypeRepository.save(foundTypes[0]).catch((error) => {
            Log.error(JSON.stringify(error));
          });
        });
    });
  }

  public async down(queryRunner: QueryRunner): Promise<any> {}
}
