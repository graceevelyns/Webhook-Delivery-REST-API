import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
