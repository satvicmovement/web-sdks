import React from 'react';
import { useHMSStatsStore, HMSTrackID, HMSTrackStats, selectHMSStats } from '@100mslive/react-sdk';
import { formatBytes } from './formatBytes';
import { Stats } from './StyledStats';

export interface VideoTileStatsProps {
  videoTrackID?: HMSTrackID;
  audioTrackID?: HMSTrackID;
}

/**
 * This component can be used to overlay webrtc stats over the Video Tile. For the local tracks it also includes
 * remote inbound stats as sent by the SFU in receiver report.
 */
export function VideoTileStats({ videoTrackID, audioTrackID }: VideoTileStatsProps) {
  const audioTrackStats = useHMSStatsStore(selectHMSStats.trackStatsByID(audioTrackID));
  const videoTrackStats = useHMSStatsStore(selectHMSStats.trackStatsByID(videoTrackID));
  // Viewer role - no stats to show
  if (!(audioTrackStats || videoTrackStats)) {
    return null;
  }
  return (
    <Stats.Root>
      <table>
        <tbody>
          <StatsRow
            show={isNotNullishAndNot0(videoTrackStats?.frameWidth)}
            label="Width"
            value={videoTrackStats?.frameWidth?.toString()}
          />
          <StatsRow
            show={isNotNullishAndNot0(videoTrackStats?.frameHeight)}
            label="Height"
            value={videoTrackStats?.frameHeight?.toString()}
          />
          <StatsRow
            show={isNotNullishAndNot0(videoTrackStats?.framesPerSecond)}
            label="FPS"
            value={`${videoTrackStats?.framesPerSecond} ${
              isNotNullishAndNot0(videoTrackStats?.framesDropped) ? `(${videoTrackStats?.framesDropped} dropped)` : ''
            }`}
          />

          <StatsRow
            show={isNotNullish(videoTrackStats?.bitrate)}
            label="Bitrate(V)"
            value={formatBytes(videoTrackStats?.bitrate, 'b/s')}
          />

          <StatsRow
            show={isNotNullish(audioTrackStats?.bitrate)}
            label="Bitrate(A)"
            value={formatBytes(audioTrackStats?.bitrate, 'b/s')}
          />

          <PacketLostAndJitter audioTrackStats={audioTrackStats} videoTrackStats={videoTrackStats} />
        </tbody>
      </table>
    </Stats.Root>
  );
}

const PacketLostAndJitter = ({
  audioTrackStats,
  videoTrackStats,
}: {
  audioTrackStats?: HMSTrackStats;
  videoTrackStats?: HMSTrackStats;
}) => {
  // for local peer, we'll use the remote inbound stats to get packet loss and jitter, to know whether the track is
  // local we check if the stats type has outbound in it as it's being published from local. Both audio and video
  // tracks are checked in case the user has permission to publish only one of them.
  const isLocalPeer = audioTrackStats?.type.includes('outbound') || videoTrackStats?.type.includes('outbound');
  const audioStats = isLocalPeer ? audioTrackStats?.remote : audioTrackStats;
  const videoStats = isLocalPeer ? videoTrackStats?.remote : videoTrackStats;
  return (
    <>
      <TrackPacketsLostRow label="Packet Loss(V)" stats={videoStats} />
      <TrackPacketsLostRow label="Packet Loss(A)" stats={audioStats} />
      <StatsRow show={isNotNullish(videoStats?.jitter)} label="Jitter(V)" value={videoStats?.jitter?.toFixed(4)} />
      <StatsRow show={isNotNullish(audioStats?.jitter)} label="Jitter(A)" value={audioStats?.jitter?.toFixed(4)} />
    </>
  );
};

const TrackPacketsLostRow = ({
  stats,
  label,
}: {
  stats?: Pick<HMSTrackStats, 'packetsLost' | 'packetsLostRate'>;
  label: string;
}) => {
  const packetsLostRate = (stats?.packetsLostRate ? stats.packetsLostRate.toFixed(2) : 0) + '/s';

  return (
    <StatsRow
      show={isNotNullishAndNot0(stats?.packetsLost)}
      label={label}
      value={`${stats?.packetsLost}(${packetsLostRate})`}
    />
  );
};

const RawStatsRow = ({ label = '', value = '', show = true }) => {
  return (
    <>
      {show ? (
        <Stats.Row>
          <Stats.Label>{label}</Stats.Label>
          {value === '' ? <Stats.Value /> : <Stats.Value>{value}</Stats.Value>}
        </Stats.Row>
      ) : null}
    </>
  );
};

// memoize so only the rows which change rerender
const StatsRow = React.memo(RawStatsRow);

export function isNotNullishAndNot0(value: number | undefined | null) {
  return isNotNullish(value) && value !== 0;
}

/**
 * Check only for presence(not truthy) of a value.
 * Use in places where 0, false need to be considered valid.
 */
export function isNotNullish(value: number | undefined | null) {
  return value !== undefined && value !== null;
}