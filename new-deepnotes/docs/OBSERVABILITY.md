# Observability

> **Purpose:** Monitoring dashboard queries and metrics for production observability.  
> **Created:** 2026-05-31  
> **Context:** Phase 9 - Production Readiness

---

## Structured Logging Format

All Durable Object logs use JSON format:

```json
{
  "level": "info|warn|error",
  "event": "event_name",
  "pageId": "page_id" | "userId": "user_id",
  "timestamp": 1234567890,
  ...additional_fields
}
```

---

## PageCollabRoom Events

### Connection Events

| Event | Level | Fields | Description |
|-------|-------|--------|-------------|
| `ws_connection_accepted` | info | `userId` | WebSocket connection accepted |
| `ws_connection_rejected` | warn | `reason` | WebSocket connection rejected |

### Message Processing Events

| Event | Level | Fields | Description |
|-------|-------|--------|-------------|
| `ws_message_rejected` | warn | `reason`, `userId` | Message rejected (decode failed, missing attachment) |
| `collab_misconfigured` | error | `userId` | Collab server misconfigured (missing secret/worker) |
| `collab_append_failed` | error | `userId`, `status`, `latency` | Collab append to DB failed |
| `collab_parse_failed` | error | `userId`, `latency` | Failed to parse DB response |
| `collab_invalid_payload` | error | `userId`, `latency` | Invalid DB response payload |
| `collab_update_processed` | info | `userId`, `updateId`, `dbIndex`, `latency` | Collab update successfully processed |

---

## UserRealtimeRoom Events

### Connection Events

| Event | Level | Fields | Description |
|-------|-------|--------|-------------|
| `realtime_ws_connection_accepted` | info | `userId` | Realtime WebSocket connection accepted |
| `realtime_ws_connection_rejected` | warn | `reason` | Realtime WebSocket connection rejected |

### Message Processing Events

| Event | Level | Fields | Description |
|-------|-------|--------|-------------|
| `realtime_ws_message_rejected` | warn | `reason`, `userId` | Message rejected (decode failed, missing attachment) |
| `realtime_ws_batch_processed` | info | `userId`, `latency`, `responseSize`, `hsetBroadcastCount` | Realtime batch successfully processed |
| `realtime_ws_batch_failed` | error | `userId`, `error` | Realtime batch processing failed |

---

## Cloudflare Workers Analytics Queries

### PageCollabRoom Metrics

#### WS Connection Rate
```
filter(event: "ws_connection_accepted")
| stats count() by pageId
| sort count() desc
```

#### WS Connection Rejection Rate
```
filter(event: "ws_connection_rejected")
| stats count() by reason
```

#### Collab Update Latency (p95)
```
filter(event: "collab_update_processed")
| stats percentile(latency, 95) as p95_latency
```

#### Collab Update Error Rate
```
filter(event: "collab_append_failed" or event: "collab_parse_failed" or event: "collab_invalid_payload")
| stats count() by event
```

#### Collab Update Throughput
```
filter(event: "collab_update_processed")
| timechart count() as updates_per_minute
```

### UserRealtimeRoom Metrics

#### Realtime WS Connection Rate
```
filter(event: "realtime_ws_connection_accepted")
| stats count() by userId
```

#### Realtime Batch Latency (p95)
```
filter(event: "realtime_ws_batch_processed")
| stats percentile(latency, 95) as p95_latency
```

#### Realtime Batch Error Rate
```
filter(event: "realtime_ws_batch_failed")
| stats count() by error
```

#### Realtime HSET Broadcast Rate
```
filter(event: "realtime_ws_batch_processed")
| stats sum(hsetBroadcastCount) as total_broadcasts
```

---

## Postgres Metrics Queries

### Collab Update Row Rate
```sql
-- Count page_updates rows created per hour per page
SELECT 
  page_id,
  date_trunc('hour', created_at) as hour,
  COUNT(*) as row_count
FROM page_updates
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY page_id, hour
ORDER BY page_id, hour DESC;
```

### Collab Update Squashing Effectiveness
```sql
-- Check if squashing is keeping row rate under control
SELECT 
  page_id,
  COUNT(*) as total_rows,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) / NULLIF(COUNT(DISTINCT user_id), 0) as rows_per_user
FROM page_updates
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY page_id
HAVING COUNT(*) > 1000;  -- Alert threshold
```

### DB Query Latency
```sql
-- Average query latency by operation type
SELECT 
  operation_type,
  AVG(latency_ms) as avg_latency,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
FROM query_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY operation_type;
```

---

## Redis/Upstash Metrics

### Redis HSET Latency
```
# Upstash dashboard: monitor HSET operation latency
# Target: < 50ms p95
```

### Redis Pub/Sub Message Rate
```
# Upstash dashboard: monitor PUBLISH rate per channel
# Target: < 1000 msg/sec per channel
```

### Redis Connection Pool Usage
```
# Upstash dashboard: monitor active connections
# Target: < 80% of max pool size
```

---

## Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Collab update latency p95 | > 100ms | > 200ms | Investigate DB/DO performance |
| Collab update error rate | > 1% | > 5% | Check DO configuration |
| Realtime batch latency p95 | > 100ms | > 200ms | Investigate Redis/DB |
| Realtime batch error rate | > 1% | > 5% | Check Redis connectivity |
| Page updates row rate | > 500/hour | > 1000/hour | Check squashing mechanism |
| WS connection rejection rate | > 5% | > 10% | Check auth middleware |

---

## Dashboard Setup

### Cloudflare Workers Analytics

1. Navigate to Workers & Pages → Analytics
2. Create custom dashboard with above queries
3. Set up alerts for critical thresholds

### Postgres Monitoring

1. Use pg_stat_statements extension
2. Set up monitoring for slow queries (> 100ms)
3. Monitor connection pool usage

### Upstash Redis Monitoring

1. Enable Upstash console metrics
2. Monitor HSET latency and pub/sub rates
3. Set up alerts for connection failures

---

*End of observability guide*
