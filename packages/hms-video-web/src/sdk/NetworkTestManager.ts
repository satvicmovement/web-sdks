import AnalyticsEventFactory from '../analytics/AnalyticsEventFactory';
import { EventBus } from '../events/EventBus';
import { HMSUpdateListener } from '../interfaces';
import { NetworkHealth, ScoreMap } from '../signal/init/models';
import HMSLogger from '../utils/logger';
import { sleep } from '../utils/timer-utils';

export class NetworkTestManager {
  private TAG = 'NetworkTestManager';
  private controller = new AbortController();
  constructor(private eventBus: EventBus, private listener?: HMSUpdateListener) {}

  start = async (networkHealth: NetworkHealth) => {
    if (!window.HMS?.NETWORK_TEST || !networkHealth) {
      return;
    }
    const { url, timeout, scoreMap } = networkHealth;
    const signal = this.controller.signal;

    const startTime = Date.now();
    let downloadedSize = 0;
    const timeoutPromise = sleep(timeout).then(() => {
      this.controller.abort();
      return true;
    });
    try {
      const res = await fetch(`${url}?${Date.now()}`, { signal });
      const reader = res.body?.getReader();
      if (!reader) {
        throw Error('unable to process request');
      }
      const readData = async () => {
        if (!reader) {
          return;
        }
        try {
          let completed = false;
          while (!completed) {
            const { value, done } = await reader.read();
            completed = done;
            if (value) {
              downloadedSize += value.byteLength;
            }
          }
        } catch (error) {
          HMSLogger.e(this.TAG, error);
        }
      };

      return Promise.race([readData(), timeoutPromise])
        .then(() => {
          const totalTimeInSecs = (Date.now() - startTime) / 1000;
          const sizeInKB = downloadedSize / 1024;
          const bitrate = (sizeInKB / totalTimeInSecs) * 8;
          const score = this.calculateScore(scoreMap, bitrate);
          this.listener?.onNetworkQuality?.(score);
          this.eventBus.analytics.publish(
            AnalyticsEventFactory.previewNetworkQuality({ score, downLink: bitrate.toFixed(2) }),
          );
        })
        .catch(error => {
          HMSLogger.e(this.TAG, error);
          this.listener?.onNetworkQuality?.(0);
          this.eventBus.analytics.publish(
            AnalyticsEventFactory.previewNetworkQuality({ error: (error as Error).message }),
          );
        });
    } catch (error) {
      HMSLogger.e(this.TAG, error);
      if ((error as Error).name !== 'AbortError') {
        this.listener?.onNetworkQuality?.(0);
        this.eventBus.analytics.publish(
          AnalyticsEventFactory.previewNetworkQuality({ error: (error as Error).message }),
        );
      }
    }
  };

  stop = () => {
    if (!this.controller.signal.aborted) {
      this.controller.abort();
    }
  };

  private calculateScore = (scoreMap: ScoreMap, bitrate: number) => {
    for (const score in scoreMap) {
      const thresholds = scoreMap[score];
      if (bitrate >= thresholds.low && (!thresholds.high || bitrate <= thresholds.high)) {
        return Number(score);
      }
    }
    return -1;
  };
}