# 0016: Car names in the address

Date: 2026-10-13

Status: Accepted.

## Context

The dashboard address named a car by its TeslaMate id, such as `/cars/2`. With two cars, the address did not say which car a page shows, and a saved link read as a number. Each car already has a name in TeslaMate.

## Decision

1. The address names the car by a slug of its name, such as `/cars/red-rocket/drives`. `carSlugs()` lowercases the name, drops accents, writes `ı` as `i` and `ß` as `ss`, and joins the words with `-`.
2. When two cars give the same slug, both slugs end with the car id, such as `juniper-3` and `juniper-7`.
3. A name without a letter or a digit, or a name that reads as a number, gives `car-<id>`. So a slug never looks like an id.
4. The id address stays valid. `findCarByParam()` takes a slug first and an id second, so old links and bookmarks open the same page. In the browser, `CanonicalCarPath` then replaces the id in the address with the slug, without a new request.
5. The API keeps the id, such as `/api/cars/2/summary.json`. Scripts need an address that does not change when the car gets a new name.
6. The Default car setting keeps the id, for the same reason.

## Alternatives

1. A redirect from the id address on the server. The car layout does not know the rest of the path, and a redirect in `proxy.ts` would add a database read to every request.
2. An id and a name together, such as `/cars/2-red-rocket`. It keeps the number in the address, which is the part this change removes.

## Consequences

A new name in TeslaMate gives a new address. A link with the old name then gives the not-found page. A link with the id keeps working.
