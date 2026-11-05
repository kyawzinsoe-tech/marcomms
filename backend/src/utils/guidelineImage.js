const MAX=10*1024*1024;
function imageData(base64,mimeType){
 if(!['image/png','image/jpeg'].includes(mimeType)||typeof base64!=='string'||base64.length>Math.ceil(MAX/3)*4+4)throw Object.assign(new Error('Use a PNG/JPEG image up to 10 MB.'),{statusCode:400});
 const bytes=Buffer.from(base64,'base64');let width,height;
 if(!bytes.length||bytes.length>MAX)throw Object.assign(new Error('Image must be between 1 byte and 10 MB.'),{statusCode:400});
 if(mimeType==='image/png'&&bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'){width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);}
 else if(mimeType==='image/jpeg'&&bytes[0]===255&&bytes[1]===216){let pos=2;while(pos+4<=bytes.length){if(bytes[pos++]!==255)break;let marker=bytes[pos++];while(marker===255&&pos<bytes.length)marker=bytes[pos++];if(marker===217||marker===218)break;const len=bytes.readUInt16BE(pos);if(len<2||pos+len>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&len>=7){height=bytes.readUInt16BE(pos+3);width=bytes.readUInt16BE(pos+5);break;}pos+=len;}}
 if(!width||!height||width>100000||height>100000)throw Object.assign(new Error('Unable to read PNG/JPEG dimensions. Choose a valid image.'),{statusCode:400});return {imageData:bytes,imageMimeType:mimeType,imageWidth:width,imageHeight:height};
}
module.exports={imageData};
