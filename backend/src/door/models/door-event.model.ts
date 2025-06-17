import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class DoorEventModel {
  @Field(() => ID)
  id: string;

  @Field(() => Boolean)
  doorIsOpen: boolean;

  @Field(() => String)
  eventTimestamp: Date;

  @Field(() => String)
  sensorId: string;
}
