export interface ApiResponseBase {
  ok: boolean;
  sid: string;
}

export interface ApiSuccessResponse extends ApiResponseBase {
  ok: true;
  action: "created" | "updated";
}
export interface ApiErrorResponse extends ApiResponseBase {
  ok: false;
  error: string;
  message?: string;
}

export type EditResponse = ApiSuccessResponse | ApiErrorResponse;
