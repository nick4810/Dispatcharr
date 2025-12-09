import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import {
  PROGRAM_HEIGHT,
  EXPANDED_PROGRAM_HEIGHT,
  buildChannelIdMap,
  mapProgramsByChannel,
  computeRowHeights,
} from '../guideUtils.js';

describe('guideUtils', () => {
  describe('constants', () => {
    it('exports expected height constants', () => {
      expect(PROGRAM_HEIGHT).toBe(90);
      expect(EXPANDED_PROGRAM_HEIGHT).toBe(180);
    });
  });

  describe('buildChannelIdMap', () => {
    it('maps tvg ids from epg records and falls back to channel uuid', () => {
      const channels = [
        { id: 1, epg_data_id: 'epg-1', uuid: 'uuid-1' },
        { id: 2, epg_data_id: null, uuid: 'uuid-2' },
      ];
      const tvgsById = {
        'epg-1': { tvg_id: 'alpha' },
      };

      const map = buildChannelIdMap(channels, tvgsById);

      expect(map.get('uuid-1')).toEqual([1]);
      expect(map.get('uuid-2')).toEqual([2]);
    });

    it('uses channel uuid for dummy EPG sources', () => {
      const channels = [
        { id: 1, epg_data_id: 'epg-1', uuid: 'uuid-1' },
        { id: 2, epg_data_id: 'epg-1', uuid: 'uuid-2' },
      ];
      const tvgsById = {
        'epg-1': { tvg_id: 'shared-tvg', epg_source: 'source-1' },
      };
      const epgs = {
        'source-1': { source_type: 'dummy' },
      };

      const map = buildChannelIdMap(channels, tvgsById, epgs);

      expect(map.get('uuid-1')).toEqual([1]);
      expect(map.get('uuid-2')).toEqual([2]);
      expect(map.get('shared-tvg')).toBeUndefined();
    });

    it('groups multiple channels with same tvg_id for regular EPG', () => {
      const channels = [
        { id: 1, epg_data_id: 'epg-1', uuid: 'uuid-1' },
        { id: 2, epg_data_id: 'epg-2', uuid: 'uuid-2' },
      ];
      const tvgsById = {
        'epg-1': { tvg_id: 'alpha', epg_source: 'source-1' },
        'epg-2': { tvg_id: 'alpha', epg_source: 'source-1' },
      };
      const epgs = {
        'source-1': { source_type: 'regular' },
      };

      const map = buildChannelIdMap(channels, tvgsById, epgs);

      expect(map.get('alpha')).toEqual([1, 2]);
    });

    it('handles tvg record without tvg_id', () => {
      const channels = [
        { id: 1, epg_data_id: 'epg-1', uuid: 'uuid-1' },
      ];
      const tvgsById = {
        'epg-1': { epg_source: 'source-1' },
      };
      const epgs = {
        'source-1': { source_type: 'regular' },
      };

      const map = buildChannelIdMap(channels, tvgsById, epgs);

      expect(map.get('uuid-1')).toEqual([1]);
    });

    it('returns empty map for empty channels array', () => {
      const map = buildChannelIdMap([], {});

      expect(map.size).toBe(0);
    });
  });

  describe('mapProgramsByChannel', () => {
    it('groups programs by channel and sorts them by start time', () => {
      const programs = [
        {
          id: 10,
          tvg_id: 'alpha',
          start_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T03:00:00Z').toISOString(),
          title: 'Late Show',
        },
        {
          id: 11,
          tvg_id: 'alpha',
          start_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
          title: 'Evening News',
        },
        {
          id: 20,
          tvg_id: 'beta',
          start_time: dayjs('2025-01-01T00:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          title: 'Morning Show',
        },
      ];

      const channelIdByTvgId = new Map([
        ['alpha', [1]],
        ['beta', [2]],
      ]);

      const map = mapProgramsByChannel(programs, channelIdByTvgId);

      expect(map.get(1)).toHaveLength(2);
      expect(map.get(1)?.map((item) => item.id)).toEqual([11, 10]);
      expect(map.get(2)).toHaveLength(1);
      expect(map.get(2)?.[0].startMs).toBeTypeOf('number');
      expect(map.get(2)?.[0].endMs).toBeTypeOf('number');
    });

    it('distributes programs to multiple channels with same tvg_id', () => {
      const programs = [
        {
          id: 10,
          tvg_id: 'alpha',
          start_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
          title: 'Show',
        },
      ];

      const channelIdByTvgId = new Map([
        ['alpha', [1, 2, 3]],
      ]);

      const map = mapProgramsByChannel(programs, channelIdByTvgId);

      expect(map.get(1)).toHaveLength(1);
      expect(map.get(2)).toHaveLength(1);
      expect(map.get(3)).toHaveLength(1);
      expect(map.get(1)?.[0].id).toBe(10);
      expect(map.get(2)?.[0].id).toBe(10);
      expect(map.get(3)?.[0].id).toBe(10);
    });

    it('uses existing startMs and endMs if present', () => {
      const startMs = 1000000;
      const endMs = 2000000;
      const programs = [
        {
          id: 10,
          tvg_id: 'alpha',
          start_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
          startMs,
          endMs,
        },
      ];

      const channelIdByTvgId = new Map([['alpha', [1]]]);

      const map = mapProgramsByChannel(programs, channelIdByTvgId);

      expect(map.get(1)?.[0].startMs).toBe(startMs);
      expect(map.get(1)?.[0].endMs).toBe(endMs);
    });

    it('skips programs with unknown tvg_id', () => {
      const programs = [
        {
          id: 10,
          tvg_id: 'unknown',
          start_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
        },
      ];

      const channelIdByTvgId = new Map([['alpha', [1]]]);

      const map = mapProgramsByChannel(programs, channelIdByTvgId);

      expect(map.size).toBe(0);
    });

    it('returns empty map for null programs', () => {
      const map = mapProgramsByChannel(null, new Map());

      expect(map.size).toBe(0);
    });

    it('returns empty map for empty programs array', () => {
      const map = mapProgramsByChannel([], new Map([['alpha', [1]]]));

      expect(map.size).toBe(0);
    });

    it('returns empty map for null channelIdByTvgId', () => {
      const programs = [
        {
          id: 10,
          tvg_id: 'alpha',
          start_time: dayjs('2025-01-01T01:00:00Z').toISOString(),
          end_time: dayjs('2025-01-01T02:00:00Z').toISOString(),
        },
      ];

      const map = mapProgramsByChannel(programs, null);

      expect(map.size).toBe(0);
    });
  });

  describe('computeRowHeights', () => {
    it('returns program heights with expanded rows when needed', () => {
      const filteredChannels = [
        { id: 1 },
        { id: 2 },
      ];

      const programsByChannel = new Map([
        [1, [{ id: 10 }, { id: 11 }]],
        [2, [{ id: 20 }]],
      ]);

      const collapsed = computeRowHeights(
        filteredChannels,
        programsByChannel,
        null
      );
      expect(collapsed).toEqual([PROGRAM_HEIGHT, PROGRAM_HEIGHT]);

      const expanded = computeRowHeights(
        filteredChannels,
        programsByChannel,
        10
      );
      expect(expanded).toEqual([
        EXPANDED_PROGRAM_HEIGHT,
        PROGRAM_HEIGHT,
      ]);
    });

    it('uses custom height values when provided', () => {
      const filteredChannels = [{ id: 1 }, { id: 2 }];
      const programsByChannel = new Map([[1, [{ id: 10 }]]]);

      const heights = computeRowHeights(
        filteredChannels,
        programsByChannel,
        10,
        100,
        200
      );

      expect(heights).toEqual([200, 100]);
    });

    it('handles channels with no programs', () => {
      const filteredChannels = [{ id: 1 }];
      const programsByChannel = new Map();

      const heights = computeRowHeights(
        filteredChannels,
        programsByChannel,
        null
      );

      expect(heights).toEqual([PROGRAM_HEIGHT]);
    });

    it('returns empty array for null filteredChannels', () => {
      const heights = computeRowHeights(null, new Map(), null);

      expect(heights).toEqual([]);
    });

    it('returns empty array for empty filteredChannels', () => {
      const heights = computeRowHeights([], new Map(), null);

      expect(heights).toEqual([]);
    });

    it('expands correct row when program exists in multiple channels', () => {
      const filteredChannels = [{ id: 1 }, { id: 2 }];
      const programsByChannel = new Map([
        [1, [{ id: 10 }]],
        [2, [{ id: 10 }]],
      ]);

      const heights = computeRowHeights(
        filteredChannels,
        programsByChannel,
        10
      );

      expect(heights).toEqual([
        EXPANDED_PROGRAM_HEIGHT,
        EXPANDED_PROGRAM_HEIGHT,
      ]);
    });
  });
});
