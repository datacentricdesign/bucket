import { DeleteResult, getRepository } from "typeorm";

import { PropertyType } from "./PropertyType";
import { DCDError } from "@datacentricdesign/types";

export class PropertyTypeService {
  private static instance: PropertyTypeService;

  public static getInstance(): PropertyTypeService {
    if (PropertyTypeService.instance === undefined) {
      PropertyTypeService.instance = new PropertyTypeService();
    }
    return PropertyTypeService.instance;
  }

  /**
   * List existing property types.
   *
   */
  getPropertyTypes(): Promise<PropertyType[]> {
    // Get things from the database
    const propertyTypeRepository = getRepository(PropertyType);
    return propertyTypeRepository.find({
      cache: true,
      relations: ["dimensions"],
    });
  }

  /**
   * Read a PropertyType.
   * @param {string} typeId
   * returns {PropertyType}
   *
   */
  getOnePropertyTypeById(typeId: string): Promise<PropertyType> {
    // Get things from the database
    const propertyTypeRepository = getRepository(PropertyType);
    return propertyTypeRepository.findOneOrFail(typeId, {
      cache: true,
      relations: ["dimensions"],
    });
  }

  /**
   * Read a PropertyType.
   * @param {PropertyType} propertyType
   * returns {PropertyType}
   *
   */
  async createOnePropertyType(
    propertyType: PropertyType
  ): Promise<PropertyType> {
    // Get things from the database
    const propertyTypeRepository = getRepository(PropertyType);
    await propertyTypeRepository.save(propertyType);
    return propertyType;
  }

  /**
   * Delete one property type
   * @param propertyTypeId
   * @return {Promise}
   */
  async deleteOnePropertyTypeById(
    propertyTypeId: string
  ): Promise<DeleteResult> {
    const propertyTypeRepository = getRepository(PropertyType);
    try {
      await propertyTypeRepository.findOneOrFail(propertyTypeId);
    } catch (error) {
      throw new DCDError(
        404,
        `PropertyType to delete ${propertyTypeId} could not be not found.`
      );
    }
    /*
     * Await getConnection().createQueryBuilder().delete()
     *     .from(PropertyType)
     *     .where("PropertyType.id = :propertyTypeId", { propertyTypeId })
     *     .execute();
     */
    return propertyTypeRepository.delete(propertyTypeId);
  }
}
