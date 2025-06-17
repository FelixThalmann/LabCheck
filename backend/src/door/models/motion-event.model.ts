import { Field, ObjectType, ID } from '@nestjs/graphql';

@ObjectType()
export class MotionEventModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  eventTimestamp: Date;

  @Field(() => Boolean)
  motionDetected: boolean;

  @Field(() => String)
  sensorId: string;
}
