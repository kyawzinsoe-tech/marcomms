// @vitest-environment jsdom
import React from 'react';
import {test,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {RecruitmentSection} from '../components/recruitment/RecruitmentSection';
import * as api from '../services/recruitmentService';
vi.mock('../services/recruitmentService',()=>({fetchRecruitmentCases:vi.fn(),fetchRecruitmentBusinessUnits:vi.fn(),updateRecruitmentCase:vi.fn(),deleteRecruitmentCase:vi.fn()}));
test('assessment removal requires confirmation and updates only assessment assignment',async()=>{
 api.fetchRecruitmentCases.mockResolvedValue([{_id:'c1',candidateName:'Sample',department:'Creative',businessUnit:'Creative',position:'Designer',assessmentType:'Design Test',currentStage:'shortlisted'}]);api.fetchRecruitmentBusinessUnits.mockResolvedValue([]);api.updateRecruitmentCase.mockResolvedValue({});
 render(<RecruitmentSection user={{role:'super_admin',department:'Creative'}}/>);
 await screen.findByText('Sample');fireEvent.click(screen.getByRole('button',{name:'Assessments',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Delete Assessment',exact:true}));
 expect(api.updateRecruitmentCase).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirm Delete Assessment'}));
 await waitFor(()=>expect(api.updateRecruitmentCase).toHaveBeenCalledWith('c1',{assessmentType:''}));expect(api.deleteRecruitmentCase).not.toHaveBeenCalled();cleanup();
});
