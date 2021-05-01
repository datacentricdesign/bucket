import { validateEnv } from "../../config";
validateEnv();

import { expect } from "chai";
import { PolicyService } from "./PolicyService";

describe("Policy Service - Role to Actions", function () {
  it("empty role", function () {
    const result = PolicyService.roleToActions("");
    expect(result.length).equal(0);
  });
});
