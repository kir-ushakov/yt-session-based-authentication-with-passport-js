import { UseCase } from "../../../../shared/core/UseCase";
import { Result } from "../../../../shared/core/Result";
import { ISignUpRequestDTO, ISignUpResponseDTO } from "./signup.dto";
import { SignUpErrors } from "./signup.errors"
import { UserRepo } from "../../../../shared/repo/user.repo";
import { AppError } from "../../../../shared/core/AppError";
import { UserEmail } from "../../../../shared/domain/values/user/user-email";
import { User } from "../../../../shared/domain/models/user";
import { UseCaseError } from "../../../../shared/core/UseCaseError";
import { UserDocument } from "../../../../shared/infra/database/mongodb/user.model";
import { EmailVerificationService } from "../../services/email/email-verification.service";


export class SignUp implements UseCase<ISignUpRequestDTO, Promise<Result<UseCaseError | ISignUpResponseDTO>>> {
  private _userRepo: UserRepo;
  private _emailVerificationService: EmailVerificationService

  constructor(
    userRepo: UserRepo, 
    emailVerificationService: EmailVerificationService) {
    this._userRepo = userRepo;
    this._emailVerificationService = emailVerificationService;
  }

  public async execute(dto: ISignUpRequestDTO): Promise<Result<UseCaseError | ISignUpResponseDTO>> {
    try {

      const emailOrError = UserEmail.create(dto.email);

      if(emailOrError.isFailure) {
        return new SignUpErrors.EmailInvalid(dto.email);
      }

      // TODO: handle password, username
      const dtoResult = Result.combine([ 
        emailOrError, /*passwordOrError, usernameOrError*/ 
      ]);

      if (dtoResult.isFailure) {
        return Result.fail<UseCaseError>(dtoResult.error);
      }

      const email: UserEmail = emailOrError.getValue();

      const emailAlreadyInUse = await this.emailInUse(email);

      if(emailAlreadyInUse) {
        return new SignUpErrors.EmailAlreadyInUse(email.value);
      }

      const userOrError: Result<User> = User.create({
        username: email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      if(userOrError.isFailure) {
        // TODO handle case when user creation failed
      }

      const user: User = userOrError.getValue();

      const createdUser: UserDocument = await this._userRepo.create(user, dto.password);

      this._emailVerificationService.sendVerificationEmail(createdUser);

      const response: ISignUpResponseDTO = {
        email: createdUser.username,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName
      }
      return Result.ok(response);

    } catch(err) {
      return new AppError.UnexpectedError(err);
    }
  }

  private async emailInUse(email: UserEmail): Promise<boolean> {
    return await this._userRepo.exist(email);
  }
}
