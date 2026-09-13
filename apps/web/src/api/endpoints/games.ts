import { request } from '../client';

export interface ServerGameManifest {
	id: string;
	version: string;
	title: string;
	description: string;
	category: string;
	thumbnailUrl: string;
	entrypointUrl: string;
	permissions?: string[];
	requiredRole?: string;
	targetHardware: string;
}

export function listGames(): Promise<ServerGameManifest[]> {
	return request<ServerGameManifest[]>('GET', '/api/v1/games');
}