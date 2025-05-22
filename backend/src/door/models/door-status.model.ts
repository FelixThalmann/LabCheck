import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class DoorStatusModel {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Boolean)
  isOpen: boolean;

  @Field(() => String)
  timestamp: Date;

  @Field(() => String)
  sensorId: string;
}
