// Automatically generated by service-generator.js, don't change!
import { BaseService } from './base-service';

export class GroupManagementService extends BaseService {
  readonly serviceNane: string = 'GroupManagement';
  readonly controlUrl: string = '/GroupManagement/Control';  
  readonly eventSubUrl: string = '/GroupManagement/Event';
  readonly scpUrl: string = '/xml/GroupManagement1.xml';

  //#region methods
  async AddMember(input: { MemberID: string; BootSeq: number }):
    Promise<AddMemberResponse>{ return await this.SoapRequestWithBody<typeof input, AddMemberResponse>('AddMember', input); }

  async RemoveMember(input: { MemberID: string }):
    Promise<boolean> { return await this.SoapRequestWithBodyNoResponse<typeof input>('RemoveMember', input); }

  async ReportTrackBufferingResult(input: { MemberID: string; ResultCode: number }):
    Promise<boolean> { return await this.SoapRequestWithBodyNoResponse<typeof input>('ReportTrackBufferingResult', input); }

  async SetSourceAreaIds(input: { DesiredSourceAreaIds: string }):
    Promise<boolean> { return await this.SoapRequestWithBodyNoResponse<typeof input>('SetSourceAreaIds', input); }
  //#endregion
}

// Generated responses
export interface AddMemberResponse {
  CurrentTransportSettings: string;
  CurrentURI: string;
  GroupUUIDJoined: string;
  ResetVolumeAfter: boolean;
  VolumeAVTransportURI: string;
}