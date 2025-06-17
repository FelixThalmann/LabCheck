import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OccupancyStatusModel {
  @Field(() => Int)
  currentOccupancy: number;

  @Field(() => Int)
  totalCapacity: number;

  @Field(() => String)
  timestamp: Date;

  @Field(() => Int, {
    description: 'Percentage of capacity currently used',
    nullable: true,
  })
  percentageFull?: number;
}
