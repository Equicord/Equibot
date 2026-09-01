import { OwnerId } from "~/Client";
import Config from "~/config";

export function canManageMutedUsers(userId: string, roles?: string[] | null) {
    return userId === OwnerId || !!roles?.includes(Config.roles.mod);
}
