import { Property } from "../Property";


export interface ActionPropertyType {

    /**
     * Called at the end of PropertyService.updatePropertyValues
     * @param property 
     */
    onValuesUpdated(property: Property): Promise<void>

}