import { Request, Response, NextFunction } from "express";
import { BaseController } from "../../../../shared/infra/http/models/BaseController";
import { PassportStatic } from "passport";
import { LoginResponseDTO } from "./login.dto";
import { UserPersistent } from "../../../../shared/domain/models/user";
import { IUserDto } from "../../dto/user.dto";
import { IApiErrorDto } from "../../../../shared/infra/http/dtos/api-errors.dto";
import { EApiErrorType } from "../../../../shared/infra/http/models/api-error-types.enum";

export class LoginController extends BaseController {
  private _passport: PassportStatic;

  constructor(passport: PassportStatic) {
    super();
    this._passport = passport;
  }

  protected async executeImpl(req: Request, res: Response, next?: NextFunction): Promise<void | any> {
    try {
      this._passport.authenticate('local', (err, user, info) => {
        if(err) {
          return this.fail(res, err);
        }

        if(!user) {
          const errorDto: IApiErrorDto = {
            type: EApiErrorType.AUTHENTICATION_FAILED,
            message: "Authorization failed!"
          }
          return this.unauthorized(res, errorDto);
        }

        if(!user.verified) {
          const errorDto: IApiErrorDto = {
            type: EApiErrorType.USER_ACCOUNT_NOT_VERIFIED,
            message: "User account not verified!"
          }
          return this.unauthorized(res, errorDto);
        }

        req.logIn(user, (err) => {
          if(err) {
            console.log(err);
            return this.fail(res, err);
          }

          const loggedInUser: UserPersistent = req.user as UserPersistent;
          const userDto: IUserDto = {
            firstName: loggedInUser.firstName,
            lastName:loggedInUser.lastName,
            email: loggedInUser.username,
            userId: loggedInUser._id
          }
          const loginResponseDto: LoginResponseDTO = { userDto : userDto };
          return this.ok(res, loginResponseDto);
        });

      })(req, res, next);
    } catch(err) {
      return this.fail(res, err.toString());
    }
  }
}
