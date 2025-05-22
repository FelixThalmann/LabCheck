import { Field, ObjectType, ID, registerEnumType } from '@nestjs/graphql';
import { PassageDirection } from '@prisma/client';

// Registrieren des Enums für GraphQL
registerEnumType(PassageDirection, {
  name: 'PassageDirection',
  description: 'Direction of the passage event (IN or OUT)',
});

@ObjectType()
export class PassageEventModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  eventTimestamp: Date;

  @Field(() => PassageDirection)
  direction: PassageDirection;

  @Field(() => String)
  sensorId: string;
}
