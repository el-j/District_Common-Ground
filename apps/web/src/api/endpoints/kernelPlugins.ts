import { request } from '../client';

export interface ServerKernelPluginManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  core: boolean;
}

export function listBuiltinKernelPlugins(): Promise<ServerKernelPluginManifest[]> {
  return request<ServerKernelPluginManifest[]>('GET', '/api/v1/kernel-plugins');
}
