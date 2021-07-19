import { WebRtcConnection } from './WebRTCConnection';
import { v4 as uuidv4 } from 'uuid';
import { Property } from '../Property';


export class WebRtcConnectionManager {

  connections = new Map();
  closedListeners = new Map();

  constructor() {    
  }

  createId() {
    do {
      const id = uuidv4();
      if (!this.connections.has(id)) {
        return id;
      }
    // eslint-disable-next-line
    } while (true);
  }

  deleteConnection(connection) {
    // 1. Remove "closed" listener.
    const closedListener = this.closedListeners.get(connection);
    this.closedListeners.delete(connection);
    connection.removeListener('closed', closedListener);
  
    // 2. Remove the Connection from the Map.
    this.connections.delete(connection.id);
  }

  async createConnection(property: Property) {
    // TODO receive thing id/token

    const id = this.createId();
    const connection = new WebRtcConnection(id, property);

    const manager = this;
    // 1. Add the "closed" listener.
    function closedListener() {
      manager.deleteConnection(connection);
    }
    this.closedListeners.set(connection, closedListener);
    connection.once('closed', closedListener);

    // 2. Add the Connection to the Map.
    this.connections.set(connection.id, connection);

    await connection.doOffer();
    return connection;
  };

  getConnection(id: string) {
    return this.connections.get(id) || null;
  };

  getConnections() {
    return this.connections.values();
  };

  // toJSON() {
  //   return this.getConnections().map(connection => connection.toJSON());
  // }

}

