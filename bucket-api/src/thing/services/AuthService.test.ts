import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { DCDError } from "@datacentricdesign/types";
import { AccessControlPolicy, PolicyService } from "./PolicyService";
import Log from "../../Log";
import { AuthService } from "./AuthService";

let authService: AuthService;
let thingId: string;
let personId: string;
let createdACP: AccessControlPolicy;

describe("Auth Service", () => {
  before(async () => {
    authService = AuthService.getInstance();
    // Test values
    thingId = `dcd:things:${uuidv4()}`;
    personId = "dcd:persons:test@test.com";
  });

  it("Refresh token", (done: Mocha.Done) => {
    authService
      .refresh()
      .then(() => {
        done();
      })
      .catch((error: DCDError) => {
        Log.error(JSON.stringify(error));
        done(error);
      });
  });
});
