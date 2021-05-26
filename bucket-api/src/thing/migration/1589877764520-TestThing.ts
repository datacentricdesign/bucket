import { MigrationInterface, getRepository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import Thing from "../Thing";

class TestThing1589877764520 implements MigrationInterface {
  public async up(): Promise<void> {
    const thing = new Thing();
    thing.id = `dcd:things:${uuidv4()}`;
    thing.name = "Test Thing";
    thing.description = "Test Thing description";
    thing.type = "TEST";
    thing.personId = "dcd:persons:test@test.test";

    const thingRepository = getRepository(Thing);
    await thingRepository.save(thing);
  }

  public async down(): Promise<void> {
    // Nothing to do
  }
}

export default TestThing1589877764520;
