import fetch from 'node-fetch'
import { Request } from 'node-fetch'
import { parse } from 'fast-xml-parser'
import { Debugger } from 'debug'
import debug = require('debug')

export interface SmapiClientOptions {
  name: string;
  url: string;
  serviceId: string;
  deviceId?: string;
  timezone?: string;
}

export interface MediaResult {
  index: number;
  count: number;
  total: number;
  items?: MediaItem[];
  containers?: MediaContainer[];
}

export interface MediaItem {
  id: string;
  itemType: string;
  title: string;
  summary?: string;
  trackUri?: string;
}

export interface MediaContainer {
  id: string;
  itemType: string;
  title: string;
  summary?: string;
  albumArtURI?: string;
}

export class SmapiClient {
  private readonly options: SmapiClientOptions;
  private _debugger?: Debugger;
  protected get debug(): Debugger {
    if(this._debugger === undefined) this._debugger = debug(`sonos:smapi:${this.options.name}`)
    return this._debugger;
  }

  constructor(options: SmapiClientOptions){
    this.options = options;
  }

  public GetMediaMetadata(input: { id: string }): Promise<any> {
    return this.SoapRequestWithBody('getMediaMetadata', input);
  }

  public GetMediaUri(input: { id: string }): Promise<any> {
    return this.SoapRequestWithBody('getMediaURI', input);
  }

  /**
   * Browse for items and containers and show metadata
   *
   * @param {string} input.id Get the metadata for what? 'root' is for the top level, use the ID of a container to browse that container. Use the ID of an item to display the metadata.
   * @param {number} input.index Where to start in the list (for paging)
   * @param {number} input.count How many items do you want (for paging)
   * @returns {Promise<MediaResult>}
   * @memberof SmapiClient
   */
  public GetMetadata(input: { id: string; count: number; index: number }): Promise<MediaResult> {
    return this.SoapRequestWithBody<any,any>('getMetadata', input).then((resp: any) => this.postProcessMediaList(resp.getMetadataResult));
  }

  /**
   * Search for items (if supported)
   *
   * @param {{id: string; term: string; index: number; count: number}} input
   * @param {string} input.id The container to look in ['A:STATION', 'A:...']
   * @param {string} input.term Your query
   * @param {number} input.index Where to start in the list (for paging)
   * @param {number} input.count How many items do you want (for paging)
   * @returns {Promise<MediaResult>}
   * @memberof SmapiClient
   */
  public Search(input: {id: string; term: string; index: number; count: number}): Promise<MediaResult>{
    return this.SoapRequestWithBody<any, any>('search', input).then((resp: any) => this.postProcessMediaList(resp.searchResult));
  }

  private postProcessMediaList(input: any): MediaResult {
    const result: MediaResult = {
      index: input.index,
      count: input.count,
      total: input.total,
      items: this.forceArray(input.mediaMetadata),
      containers: this.forceArray(input.mediaCollection)
    };

    if(result.items !== undefined){
      // TODO Implement this for other item types.
      result.items.forEach(m => {
        if(m.itemType === 'stream')
          m.trackUri = `x-sonosapi-stream:${m.id}?sid=${this.options.serviceId}`
      });
    }

    return result;
  }

  //#region Private server stuff
  SoapRequest<TResponse>(action: string): Promise<TResponse> {
    this.debug('%s()', action);
    return this.handleRequestAndParseResponse<TResponse>(this.generateRequest<undefined>(action, undefined), action);
  }

  SoapRequestWithBody<TBody,TResponse>(action: string, body: TBody): Promise<TResponse> {
    this.debug('%s(%o)', action, body);
    return this.handleRequestAndParseResponse<TResponse>(this.generateRequest<TBody>(action, body), action);
  }

  private handleRequestAndParseResponse<TResponse>(request: Request, action: string): Promise<TResponse> {
    return fetch(request)
      .then(response => {
        if(response.ok) {
          return response.text();
        } else {
          this.debug('handleRequest error %d %s', response.status, response.statusText)
          throw new Error(`Http status ${response.status} (${response.statusText})`);
        }
      })
      .then(body => parse(body, { ignoreNameSpace: true }))
      .then(result => {
        if (!result || !result.Envelope || !result.Envelope.Body) {
          this.debug('Invalid response for %s %o', action, result)
          throw new Error(`Invalid response for ${action}: ${result}`)
        }
        if (typeof result.Envelope.Body.Fault !== 'undefined') {
          const fault = result.Envelope.Body.Fault;
          this.debug('Soap error %s %o', action, fault)
          throw new Error(`SOAP Fault ${fault}`)
        }
        this.debug('handleRequest success')
        return result.Envelope.Body[`${action}Response`];
      })
  }

  private messageAction(action: string): string {
    return `"http://www.sonos.com/Services/1.1#${action}"`;
  }

  private generateRequest<TBody>(action: string, body: TBody): Request{
    return new Request(
      this.options.url,
      { 
        method: "POST", 
        headers: {
          SOAPAction: this.messageAction(action),
          'Content-type': 'text/xml; charset=utf-8',
          'Accept-Language': 'en-US',
          'Accept-Encoding': 'gzip, deflate',
          'User-Agent': 'Linux UPnP/1.0 Sonos/29.3-87071 (ICRU_iPhone7,1); iOS/Version 8.2 (Build 12D508)'
        },
        body: this.generateRequestBody<TBody>(action, body)
      }
    );
  }

  private forceArray<TArray>(input: unknown | undefined): TArray[] | undefined {
    if(input === undefined) return undefined;
    return (Array.isArray(input) ? input : [input]) as TArray[];
  } 

  private generateRequestBody<TBody>(action: string, body: TBody): string {
    const soapHeader = this.generateSoapHeader();
    const soapBody = this.generateSoapBody<TBody>(action, body);
    return this.generateSoapEnvelope([soapHeader, soapBody]);
  }

  private generateSoapBody<TBody>(action: string, body: TBody): string {
    let messageBody = `<soap:Body>\r\n<s:${action}>`
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        // if (typeof value === 'object' && key.indexOf('MetaData') > -1)
        //   messageBody += `<${key}>${XmlHelper.EncodeXml(MetadataHelper.TrackToMetaData(value))}</${key}>`;
        // else if(typeof value === 'string' && key.endsWith('URI'))
        //   messageBody += `<${key}>${XmlHelper.EncodeTrackUri(value)}</${key}>`;
        if (typeof value === 'boolean')
          messageBody += `<s:${key}>${value === true ? '1' : '0'}</s:${key}>`;
        else
          messageBody += `<s:${key}>${value}</s:${key}>`;
      }
    }
    messageBody += `</s:${action}>\r\n</soap:Body>`;
    return messageBody;
  }

  private generateCredentialHeader(options: { deviceId?: string; deviceCert?: string; zonePlayerId?: string; loginToken?: {authToken: string; refreshToken: string; householdId: string}} = {}): string {
    let header = `<s:credentials>\r\n    <s:deviceId>${options.deviceId}</s:deviceId>\r\n`;
    
    if(options.deviceCert !== undefined)
      header += `    <s:deviceCert>${options.deviceCert}</s:deviceCert>\r\n`

    if(options.zonePlayerId !== undefined)
      header += `    <s:zonePlayerId>${options.zonePlayerId}</s:zonePlayerId>\r\n`

    header += '    <s:deviceProvider>Sonos</s:deviceProvider>\r\n'

    if(options.loginToken !== undefined)
      header += `    <s:loginToken>
      <s:token>${options.loginToken.authToken}</s:token>
      <s:key>${options.loginToken.refreshToken}</s:key>
      <s:householdId>${options.loginToken.householdId}</s:householdId>
    </s:loginToken>\r\n`

    header += '  </s:credentials>'
    return header;
  }

  private generateContextHeader(timezone: string): string { //  filterExplicit = false
    return   `<s:context>
      <s:timeZone>${timezone}</s:timeZone>
    </s:context>`
  //       <contentFiltering><explicit>${filterExplicit}</explicit></contentFiltering>
  }

  private generateSoapHeader(): string {
    let header = '<soap:Header>\r\n';
    header += this.generateContextHeader(this.options.timezone || '+01:00' ) + '\r\n';
    header += this.generateCredentialHeader({ deviceId: this.options.deviceId })
    header += '</soap:Header>'
    return header;
  }

  private generateSoapEnvelope(content: string[]): string{
    let body = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:s="http://www.sonos.com/Services/1.1">\r\n';
    content.forEach(c => body += `${c}\r\n`)
    body += '</soap:Envelope>'
    this.debug('Soap envelop\r\n%s', body);
    return body;
  }
  //#endregion
}