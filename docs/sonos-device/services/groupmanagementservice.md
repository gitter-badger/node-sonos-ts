---
layout: default
title: GroupManagementService
parent: Services
grand_parent: Sonos device
---
# GroupManagementService
{: .no_toc }

```js
const SonosDevice = require('@svrooij/sonos').SonosDevice
const sonos = new SonosDevice('192.168.x.x')
sonos.GroupManagementService.OneOfTheMethodsBelow({...})
```

All methods that require input expect an object with the specified parameters, even if it only requires one parameter.

1. TOC
{:toc}

---

### AddMember

| parameter | type | description |
|:----------|:-----|:------------|
| **MemberID** | `string` |  |
| **BootSeq** | `number` |  |

### RemoveMember

| parameter | type | description |
|:----------|:-----|:------------|
| **MemberID** | `string` |  |

### ReportTrackBufferingResult

| parameter | type | description |
|:----------|:-----|:------------|
| **MemberID** | `string` |  |
| **ResultCode** | `number` |  |

### SetSourceAreaIds

| parameter | type | description |
|:----------|:-----|:------------|
| **DesiredSourceAreaIds** | `string` |  |
