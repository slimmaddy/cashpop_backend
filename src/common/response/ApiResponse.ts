export class ApiResponse<T = any> {
    constructor(
        public data: T,
        public message: string,
        public statusCode: number,
    ) {
    }
    static success<T>(
        data: T | Object,
        message: string,
        statusCode: number,
    ) {
        return new ApiResponse(data, message, statusCode);
    }
}
