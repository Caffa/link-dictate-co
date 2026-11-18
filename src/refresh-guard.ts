export const VIEW_TYPE_LINK_DICTATE_CO = 'link-dictate-co';

export function shouldRefreshForLeafChange(
	activeViewType: string | null | undefined,
): boolean {
	return activeViewType !== VIEW_TYPE_LINK_DICTATE_CO;
}
