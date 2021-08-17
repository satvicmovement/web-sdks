import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { HMSAudioTrack } from '../media/tracks';
import { DeviceChangeEvent, DeviceManager } from '../device-manager';
import NotificationManager from '../sdk/NotificationManager';
import HMSLogger from '../utils/logger';
import { IStore } from '../sdk/store';
import { HMSException } from '../error/HMSException';
import { ErrorFactory, HMSAction } from '../error/ErrorFactory';

export interface AutoplayEvent {
  error: HMSException;
}

export const AutoplayError = 'autoplay-error';
export class AudioSinkManager {
  private audioSink?: HTMLElement;
  private autoPausedTracks: Set<HMSAudioTrack> = new Set();
  private TAG = '[AudioSinkManager]:';
  private initialized = false;
  private volume: number = 100;
  private eventEmitter: EventEmitter = new EventEmitter();
  private autoplayFailed: boolean = false;

  constructor(
    private store: IStore,
    private notificationManager: NotificationManager,
    private deviceManager: DeviceManager,
  ) {
    this.notificationManager.addEventListener('track-added', this.handleTrackAdd as EventListener);
    this.notificationManager.addEventListener('track-removed', this.handleTrackRemove as EventListener);
    this.deviceManager.addEventListener('audio-device-change', this.handleAudioDeviceChange);
  }

  addEventListener(event: string, listener: (event: AutoplayEvent) => void) {
    this.eventEmitter.addListener(event, listener);
  }

  removeEventListener(event: string, listener: (event: AutoplayEvent) => void) {
    this.eventEmitter.removeListener(event, listener);
  }

  private get outputDevice() {
    return this.deviceManager.outputDevice;
  }

  getVolume() {
    return this.volume;
  }

  setVolume(value: number) {
    this.store.updateAudioOutputVolume(value);
    this.volume = value;
  }

  /**
   *  This function is to be called only on user interaction when
   *  autoplay error is received.
   */
  async unblockAutoplay() {
    if (!this.autoplayFailed) {
      return;
    }
    this.unpauseAudioTracks();
  }

  init(elementId?: string) {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const audioSink = document.createElement('div');
    audioSink.id = `HMS-SDK-audio-sink-${uuid()}`;
    const userElement = elementId && document.getElementById(elementId);
    const audioSinkParent = userElement || document.body;
    audioSinkParent.append(audioSink);

    this.audioSink = audioSink;
  }

  cleanUp() {
    this.notificationManager.removeEventListener('track-added', this.handleTrackAdd as EventListener);
    this.notificationManager.removeEventListener('track-removed', this.handleTrackRemove as EventListener);
    this.deviceManager.removeEventListener('audio-device-change', this.handleAudioDeviceChange);
    this.audioSink?.remove();
    this.autoPausedTracks = new Set();
    this.initialized = false;
    this.autoplayFailed = false;
  }

  private handleAudioPaused = (event: any) => {
    const audioEl = event.target as HTMLAudioElement;
    //@ts-ignore
    const track = audioEl.srcObject?.getAudioTracks()[0];
    if (!track?.enabled) {
      // No need to play if already disabled
      return;
    }
    // this means the audio paused because of external factors(headset removal)
    HMSLogger.d(this.TAG, 'Audio Paused', event.target.id);
    const audioTrack = this.store.getTrackById(event.target.id);
    if (audioTrack) {
      this.autoPausedTracks.add(audioTrack as HMSAudioTrack);
    }
  };

  private handleTrackAdd = (event: CustomEvent<HMSAudioTrack>) => {
    const track = event.detail;
    const audioEl = document.createElement('audio');
    audioEl.style.display = 'none';
    audioEl.id = track.trackId;
    audioEl.srcObject = new MediaStream([track.nativeTrack]);
    audioEl.addEventListener('pause', this.handleAudioPaused);
    HMSLogger.d(this.TAG, 'Audio track added', track.trackId);
    this.audioSink?.append(audioEl);
    track.setAudioElement(audioEl);
    this.outputDevice && track.setOutputDevice(this.outputDevice);
    track.setVolume(this.volume);
    /**
     * Don't play the track if autoplay already failed. Add to paused list
     */
    if (this.autoplayFailed) {
      this.autoPausedTracks.add(track);
      return;
    }
    this.handleAudioPlay(track);
  };

  private handleAudioDeviceChange = (event: DeviceChangeEvent) => {
    if (event.error || event.init) {
      return;
    }
    this.unpauseAudioTracks();
  };

  private async handleAudioPlay(track: HMSAudioTrack) {
    const audioEl = track.getAudioElement();
    if (!audioEl) {
      HMSLogger.w(this.TAG, 'No audio element found on track', track.trackId);
      return;
    }
    try {
      await audioEl.play();
      this.autoplayFailed = false;
      this.autoPausedTracks.delete(track);
      HMSLogger.d(this.TAG, 'Played track', track.trackId);
    } catch (error) {
      this.autoplayFailed = true;
      this.autoPausedTracks.add(track);
      HMSLogger.e(this.TAG, 'Failed to play track', track.trackId, error);
      const ex = ErrorFactory.TracksErrors.AutoplayBlocked(HMSAction.AUTOPLAY, '');
      this.eventEmitter.emit(AutoplayError, { error: ex });
    }
  }

  private handleTrackRemove = (event: CustomEvent<HMSAudioTrack>) => {
    const track = event.detail;
    this.autoPausedTracks.delete(track);
    const audioEl = document.getElementById(track.trackId) as HTMLAudioElement;
    if (audioEl) {
      audioEl.removeEventListener('pause', this.handleAudioPaused);
      audioEl.srcObject = null;
      audioEl.remove();
      track.setAudioElement(null);
    }
    HMSLogger.d(this.TAG, 'Audio track removed', track.trackId);
  };

  private unpauseAudioTracks = async () => {
    const promises: Promise<void>[] = [];
    this.autoPausedTracks.forEach((track) => {
      promises.push(this.handleAudioPlay(track));
    });
    // Return after all pending tracks are played
    await Promise.all(promises);
  };
}
