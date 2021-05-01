import { AuthService } from "../services/AuthService";
import { PolicyService } from "../services/PolicyService";

export class AuthController {
  static authService = new AuthService();
  static policyService = new PolicyService();
}
