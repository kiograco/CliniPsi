import { Controller, Get, Query } from '@nestjs/common';
import { SearchPsychologistsDto } from './dto/search-psychologists.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('psychologists')
  searchPsychologists(@Query() query: SearchPsychologistsDto) {
    return this.searchService.searchPsychologists(query);
  }
}
