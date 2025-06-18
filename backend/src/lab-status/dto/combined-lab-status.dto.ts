import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class CombinedLabStatus {
  @Field(() => Boolean)
  isOpen: boolean;

  @Field(() => Int)
  currentOccupancy: number;

  @Field(() => Int)
  maxOccupancy: number;

  @Field(() => String)
  color: string;

  @Field(() => Date) // Verwendung des DateTime-Scalars
  currentDate: Date;

  @Field(() => Date) // Verwendung des DateTime-Scalars
  lastUpdated: Date;
} 