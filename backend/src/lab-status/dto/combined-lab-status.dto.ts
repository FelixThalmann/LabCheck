import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLDateTime } from 'graphql-scalars'; // Für korrekte DateTime-Repräsentation

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