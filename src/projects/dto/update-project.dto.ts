import {
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
