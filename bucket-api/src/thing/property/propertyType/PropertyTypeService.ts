
import { getRepository } from "typeorm";

import { Property } from "../Property";
import { PropertyType } from "./PropertyType";

export class PropertyTypeService {

    /**
     *
     * @constructor
     */
    constructor() {
    }

    /**
     * List existing property types.
     **/
    getPropertyTypes(): Promise<PropertyType[]> {
        // Get things from the database
        const propertyTypeRepository = getRepository(PropertyType);
        return propertyTypeRepository.find({
            cache: true,
            relations: ['dimensions']
          });
    }

    /**
     * Read a PropertyType.
     * @param {string} typeId
     * returns {PropertyType}
     **/
    getOnePropertyTypeById(typeId: string): Promise<PropertyType> {
        // Get things from the database
        const propertyTypeRepository = getRepository(PropertyType);
        return propertyTypeRepository.findOneOrFail(typeId, {
            cache: true,
            relations: ['dimensions']
          });
    }

}