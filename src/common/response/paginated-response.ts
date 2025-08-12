export function PaginatedResponse<T>(
    data: T[],
    page: number,
    pageSize: number,
    totalItem: number
): Record<string, any> {
    const totalPages = Math.ceil(totalItem / pageSize);
    return {
        data,
        page,
        pageSize,
        totalItem,
        totalPages,
    };
}
