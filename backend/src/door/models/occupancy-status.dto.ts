import { IsNumber, IsDateString, IsOptional } from 'class-validator';

/**
 * DTO for occupancy status information
 * Represents current occupancy levels and capacity data
 */
export class OccupancyStatusDto {
  /** Current number of people in the space */
  @IsNumber()
  currentOccupancy: number;

  /** Total capacity of the space */
  @IsNumber()
  totalCapacity: number;

  /** Timestamp of the occupancy status */
  @IsDateString()
  timestamp: Date;

  /** Percentage of capacity currently used (optional) */
  @IsOptional()
  @IsNumber()
  percentageFull?: number;
}
