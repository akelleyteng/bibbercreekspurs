import { InputType, Field } from 'type-graphql';
import { IsEmail, MinLength, IsString } from 'class-validator';
import { Role } from '@4hclub/shared';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @Field()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @Field()
  @IsString()
  firstName!: string;

  @Field()
  @IsString()
  lastName!: string;

  @Field(() => Role)
  role!: Role;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  emergencyContact?: string;

  @Field({ nullable: true })
  emergencyPhone?: string;

  @Field({ nullable: true })
  youthFirstName?: string;

  @Field({ nullable: true })
  youthLastName?: string;
}
