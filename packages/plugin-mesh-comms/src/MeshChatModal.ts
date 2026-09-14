import { inputManager } from '../../world/InputManager';
import { playUIClick } from '../../core/audio/SoundSynth';
import { WebSerialDriver, isWebSerialSupported } from './WebSerialDriver';
import { WebBluetoothDriver, isWebBluetoothSupported } from './WebBluetoothDriver';
import { WebRtcP2pDriver, isWebRtcSupported } from './WebRtcP2pDriver';
import { PacketType, type MeshPacket } from './PacketCodec';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Transport = 'serial' | 'bluetooth' | 'webrtc';
type WebRtcRole = 'none' | 'offering' | 'answering' | 'connected';

interface LogEntry {
	direction: 'sent' | 'received';
	summary: string;
}

/**
 * Off-grid mesh terminal: connects to a LoRa radio over Web Serial/Web
 * Bluetooth, or opens a manual (paste-relay) WebRTC data channel, then lets
 * the player broadcast a commons alert or chat line and see what comes back.
 * No physical LoRa hardware exists in this environment to test against —
 * see WebSerialDriver.ts/WebBluetoothDriver.ts's scoping notes — so this UI
 * surfaces connection failures as plain status text rather than assuming
 * success.
 */
export class MeshChatModal {
	private readonly el: HTMLElement;
	private transport: Transport | null = null;
	private status = 'Choose a transport to connect to the off-grid mesh.';
	private log: LogEntry[] = [];
	private message = '';

	private readonly serialDriver = new WebSerialDriver();
	private readonly bluetoothDriver = new WebBluetoothDriver();
	private webrtcDriver: WebRtcP2pDriver | null = null;
	private webrtcRole: WebRtcRole = 'none';
	private webrtcOfferText = '';
	private webrtcAnswerText = '';
	private webrtcPasteValue = '';

	constructor(root: HTMLElement, private readonly onClose?: () => void) {
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		this.el.setAttribute('role', 'dialog');
		this.el.setAttribute('aria-modal', 'true');
		this.el.setAttribute('aria-labelledby', 'mesh-chat-title');
		root.appendChild(this.el);

		inputManager.setLocked(true);
		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();
		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});
	}

	private onPacketReceived = (packet: MeshPacket): void => {
		this.log.unshift({ direction: 'received', summary: this.describePacket(packet) });
		this.render();
	};

	private describePacket(packet: MeshPacket): string {
		switch (packet.type) {
			case PacketType.COMMONS_ALERT: return `[${packet.severity}] ${packet.message}`;
			case PacketType.CARAVAN_DISPATCH: return `${packet.senderId} → ${packet.recipientId}: ${packet.kilowatts} kW`;
			case PacketType.PEER_HANDSHAKE: return `handshake from ${packet.peerId}`;
			case PacketType.MESH_CHAT: return `${packet.senderId} (ch.${packet.channel}): ${packet.message}`;
		}
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel mesh-chat-panel interactive">
				<div class="settings-header">
					<span class="settings-title" id="mesh-chat-title">📻 Off-Grid Mesh Terminal</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-body">
					${this.renderTransportPicker()}
					<p class="civic-directory-status">${escapeHtml(this.status)}</p>
					${this.transport === 'webrtc' ? this.renderWebRtcPanel() : ''}
					${this.transport ? this.renderComposer() : ''}
					${this.renderLog()}
				</div>
			</div>
		`;
		this.bindEvents();
	}

	private renderTransportPicker(): string {
		const button = (id: Transport, label: string, supported: boolean) => `
			<button class="mesh-chat-transport${this.transport === id ? ' mesh-chat-transport--active' : ''}"
				data-transport="${id}" type="button" ${supported ? '' : 'disabled'}>
				${label}${supported ? '' : ' (unsupported)'}
			</button>`;
		return `
			<div class="mesh-chat-transports">
				${button('serial', '🔌 LoRa (USB Serial)', isWebSerialSupported())}
				${button('bluetooth', '📶 LoRa (Bluetooth)', isWebBluetoothSupported())}
				${button('webrtc', '🤝 Direct P2P (WebRTC)', isWebRtcSupported())}
			</div>
		`;
	}

	private renderWebRtcPanel(): string {
		if (this.webrtcRole === 'connected') {
			return '<p class="civic-directory-status">Direct P2P channel open.</p>';
		}
		return `
			<div class="mesh-chat-webrtc">
				<div class="civic-journal-actions">
					<button class="mesh-chat-webrtc-start" type="button">Start Handshake (Device A)</button>
					<button class="mesh-chat-webrtc-join" type="button">Join Handshake (Device B)</button>
				</div>
				${this.webrtcOfferText ? `<p class="civic-directory-status">Send this text to the other device:</p><textarea class="mesh-chat-webrtc-out" rows="3" readonly>${escapeHtml(this.webrtcOfferText)}</textarea>` : ''}
				${this.webrtcAnswerText ? `<p class="civic-directory-status">Send this reply back:</p><textarea class="mesh-chat-webrtc-out" rows="3" readonly>${escapeHtml(this.webrtcAnswerText)}</textarea>` : ''}
				<textarea class="mesh-chat-webrtc-in" rows="3" placeholder="Paste the other device's text here">${escapeHtml(this.webrtcPasteValue)}</textarea>
				<div class="civic-journal-actions">
					<button class="mesh-chat-webrtc-submit" type="button">Submit Pasted Text</button>
				</div>
			</div>
		`;
	}

	private renderComposer(): string {
		return `
			<textarea class="mesh-chat-compose" rows="2" placeholder="Message to broadcast on the mesh">${escapeHtml(this.message)}</textarea>
			<div class="civic-journal-actions">
				<button class="mesh-chat-send-alert" type="button">🚨 Send Commons Alert</button>
				<button class="mesh-chat-send-chat" type="button">💬 Send Chat</button>
			</div>
		`;
	}

	private renderLog(): string {
		if (this.log.length === 0) return '';
		const rows = this.log.slice(0, 20)
			.map(e => `<li>${e.direction === 'sent' ? '→' : '←'} ${escapeHtml(e.summary)}</li>`)
			.join('');
		return `<ul class="civic-journal-history">${rows}</ul>`;
	}

	private bindEvents(): void {
		this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());

		this.el.querySelectorAll<HTMLButtonElement>('.mesh-chat-transport').forEach(btn => {
			btn.addEventListener('click', () => {
				playUIClick();
				void this.selectTransport(btn.dataset['transport'] as Transport);
			});
		});

		const compose = this.el.querySelector<HTMLTextAreaElement>('.mesh-chat-compose');
		compose?.addEventListener('input', e => { this.message = (e.target as HTMLTextAreaElement).value; });

		this.el.querySelector<HTMLButtonElement>('.mesh-chat-send-alert')?.addEventListener('click', () => {
			void this.sendPacket({ type: PacketType.COMMONS_ALERT, severity: 'warning', message: this.message, timestamp: Date.now() });
		});
		this.el.querySelector<HTMLButtonElement>('.mesh-chat-send-chat')?.addEventListener('click', () => {
			void this.sendPacket({ type: PacketType.MESH_CHAT, channel: 0, senderId: 'you', message: this.message, timestamp: Date.now() });
		});

		this.el.querySelector<HTMLButtonElement>('.mesh-chat-webrtc-start')?.addEventListener('click', () => {
			void this.startWebRtcOffer();
		});
		this.el.querySelector<HTMLButtonElement>('.mesh-chat-webrtc-join')?.addEventListener('click', () => {
			this.webrtcRole = 'answering';
			this.render();
		});
		const pasteInput = this.el.querySelector<HTMLTextAreaElement>('.mesh-chat-webrtc-in');
		pasteInput?.addEventListener('input', e => { this.webrtcPasteValue = (e.target as HTMLTextAreaElement).value; });
		this.el.querySelector<HTMLButtonElement>('.mesh-chat-webrtc-submit')?.addEventListener('click', () => {
			void this.submitWebRtcPastedText();
		});
	}

	private async selectTransport(transport: Transport): Promise<void> {
		this.transport = transport;
		this.status = 'Connecting…';
		this.render();

		try {
			if (transport === 'serial') {
				await this.serialDriver.connect(this.onPacketReceived);
				this.status = 'Connected to LoRa radio over USB.';
			} else if (transport === 'bluetooth') {
				await this.bluetoothDriver.connect(this.onPacketReceived);
				this.status = 'Connected to LoRa radio over Bluetooth.';
			} else {
				this.status = 'Start or join a handshake below to open a direct peer-to-peer channel.';
			}
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'Connection failed.';
		}
		this.render();
	}

	private async startWebRtcOffer(): Promise<void> {
		this.webrtcRole = 'offering';
		this.webrtcDriver = new WebRtcP2pDriver();
		this.webrtcOfferText = await this.webrtcDriver.createOfferText(this.onPacketReceived);
		this.render();
	}

	private async submitWebRtcPastedText(): Promise<void> {
		const pasted = this.webrtcPasteValue.trim();
		if (!pasted) return;

		try {
			if (this.webrtcRole === 'answering') {
				this.webrtcDriver = new WebRtcP2pDriver();
				this.webrtcAnswerText = await this.webrtcDriver.acceptOfferText(pasted, this.onPacketReceived);
				this.status = 'Send the reply text back to the other device.';
			} else if (this.webrtcRole === 'offering' && this.webrtcDriver) {
				await this.webrtcDriver.acceptAnswerText(pasted);
				this.webrtcRole = 'connected';
				this.status = 'Direct P2P channel open.';
			}
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'Handshake failed.';
		}
		this.webrtcPasteValue = '';
		this.render();
	}

	private async sendPacket(packet: MeshPacket): Promise<void> {
		if (!this.message.trim() && packet.type !== PacketType.CARAVAN_DISPATCH) return;
		try {
			if (this.transport === 'serial') await this.serialDriver.send(packet);
			else if (this.transport === 'bluetooth') await this.bluetoothDriver.send(packet);
			else if (this.transport === 'webrtc' && this.webrtcDriver) this.webrtcDriver.send(packet);
			else throw new Error('Not connected to a transport yet.');

			this.log.unshift({ direction: 'sent', summary: this.describePacket(packet) });
			this.message = '';
		} catch (err) {
			this.status = err instanceof Error ? err.message : 'Send failed.';
		}
		this.render();
	}

	private close(): void {
		void this.serialDriver.disconnect();
		this.bluetoothDriver.disconnect();
		this.webrtcDriver?.close();
		this.el.classList.remove('settings-overlay--visible');
		inputManager.setLocked(false);
		setTimeout(() => {
			this.el.remove();
			this.onClose?.();
		}, 200);
	}
}
