import { request } from '../client';

export interface ServerThemeManifest {
	id: string;
	version: string;
	name: string;
	author: string;
	category: string;
	entrypoint: string;
	permissions?: string[];
}

export function listThemes(): Promise<ServerThemeManifest[]> {
	return request<ServerThemeManifest[]>('GET', '/api/v1/themes');
}
