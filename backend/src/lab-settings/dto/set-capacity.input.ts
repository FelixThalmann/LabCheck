import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@InputType()
export class SetCapacityInput {
  @Field(() => Int, { description: 'The total capacity of the lab' })
  @IsInt({ message: 'Capacity must be an integer' })
  @Min(0, { message: 'Capacity cannot be negative' })
  capacity: number;
}
