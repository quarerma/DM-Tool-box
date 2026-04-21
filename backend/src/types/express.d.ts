declare namespace Express {
  export interface Request {
    ja3?: string;
    clientPlatform?: string;
    device_id?: string;
  }
}
