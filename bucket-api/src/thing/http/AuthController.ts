import { AuthService } from "../services/AuthService";
import { PolicyService } from "../services/PolicyService";

class AuthController {
  static authService = new AuthService();

  static policyService = new PolicyService();
}

export default AuthController;
