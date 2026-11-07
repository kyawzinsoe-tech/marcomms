import {describe,it,expect} from 'vitest';
import {designPreviewUrl} from '../components/DesignReviewFile';
describe('design review embeds',()=>{
 it('keeps restricted Drive resource keys and supports Slides',()=>{expect(designPreviewUrl('https://drive.google.com/file/d/abc-123/view?resourcekey=key')).toBe('https://drive.google.com/file/d/abc-123/preview?resourcekey=key');expect(designPreviewUrl('https://docs.google.com/presentation/d/deck_123/edit#slide=id.x')).toBe('https://docs.google.com/presentation/d/deck_123/embed?start=false&loop=false');});
 it('rejects folders and unsafe embedded destinations',()=>{for(const u of ['https://drive.google.com/drive/folders/abc','https://evil.com/file/d/abc/view','javascript:alert(1)','https://user:pass@drive.google.com/file/d/abc/view'])expect(designPreviewUrl(u)).toBe('');});
});
