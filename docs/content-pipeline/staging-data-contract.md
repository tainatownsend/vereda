# Staging data contract

## Purpose

This document defines the minimum contract for a future content-reconstruction
staging layer.

PR-0013 does not create these tables.

## Required staging entities

### Editorial nodes

Required fields:

- book identifier;
- canonical source key;
- parent source key;
- node type;
- canonical order;
- label;
- title;
- source locator;
- source-map checksum.

### Reading segments

Required fields:

- provisional or approved segment key;
- canonical source key;
- segment index;
- segment count;
- boundary version;
- ordered start locator;
- ordered end locator;
- word count;
- normalized-content checksum;
- approval status.

### Current-to-successor mapping

Required fields:

- current section ID;
- successor segment key;
- relationship type;
- successor order;
- confidence;
- review status;
- progress strategy;
- rollback reference.

### Migration audit

Required fields:

- migration version;
- input snapshot checksums;
- canonical-map checksums;
- staged-content checksums;
- reviewed-by metadata;
- dry-run counts;
- applied timestamp;
- rollback status.

## Relationship types

The mapping layer must support:

- one-to-one;
- one-to-many;
- many-to-one;
- unmatched-current.

A canonical unit without a current predecessor is tracked through canonical
coverage and staged reading segments. It does not create a
current-to-successor mapping because no legacy `current_section_id` exists.

## Approval boundary

A staged segment cannot become production content until:

- its source boundary is approved;
- its checksum is stable;
- its editorial relationship is valid;
- its progress behavior is defined;
- its redistribution status is acceptable.
