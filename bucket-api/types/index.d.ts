// Type definitions for datacentricdesign (version 0.0.1)
// Project: https://datacentricdesign.org
// Definitions by: datacentricdesign <https://github.com/datacentricdesign>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped


export interface Person {
    id: string;
    email: string;
    name: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DTOPerson {
    email: string;
    name: string;
    password: string;
}

export interface Thing {
    id: string;
    name: string;
    description: string;
    type: string;
    personId: string;
    properties: Property[];
    pem: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DTOThing {
    name?: string;
    description?: string;
    typeId?: string;
}

export interface Property {
    id: string;
    name: string;
    description: string;
    type: PropertyType;
    thing: Thing;
    values: Array<Array<number | string>>;
    createdAt: Date;
}

export interface DTOProperty {
    name?: string;
    description?: string;
    typeId?: string;
}

export interface PropertyType {
    id: string;
    name: string;
    description: string;
    dimensions: Dimension[];
}

export interface Dimension {
    id: string;
    name: string;
    description: string;
    unit: string;
    type: string;
}

export interface Role {
    id: string;
    actorEntityId: string;
    subjectEntityId: string;
    role: string;
}

export interface ValueOptions {
    from: number;
    to: number;
    timeInterval: string;
    fctInterval: string;
    fill: string;
}

export interface DTORaspberryPi {
    netId: string
    pass: string
    homeSSID: string
    homePass: string
    eduroamSSID: string
    eduroamPass: string
}


export interface Profile {
    id?: string,
    displayName?: string,
    username?: string,
    profileUrl?: string,
    emails?: any[],
    _raw?: any,
    _json?: any,
    token?: any
}

export interface JSONProfile {
    id: string,
    name: string,
    login: string,
    html_url: string,
    email: string
}

export interface Context {
    userId: string
}