import { Injectable } from '@nestjs/common';

/** The current time, injectable so that expiry rules can be tested at a fixed instant. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
