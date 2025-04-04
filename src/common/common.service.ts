/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { BasePaginationDto } from './dto/base-pagination.dto';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { BaseModel } from './entity/base.entity';
import { FILTER_MAPPER } from './const/filter-mapper.const';
import { ConfigService } from '@nestjs/config';
import { ENV_HOST_KEY, ENV_PROTOCOL_KEY } from './const/env-keys.const';

@Injectable()
export class CommonService {
    constructor(
        private readonly configService: ConfigService
    ){}

    paginate<T extends BaseModel>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
        path: string,
    ) {
        if(dto.page) {
            return this.pagePaginate(
                dto,
                repository,
                overrideFindOptions,
            );
        } else {
            return this.cursorPaginate(
                dto,
                repository,
                overrideFindOptions,
                path,
            );
        }
    }

    private async pagePaginate<T extends BaseModel>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
    ) {
        const findOptions = this.composeFindOptions<T>(dto);

        const [data, count] = await repository.findAndCount({
            ...findOptions,
            ...overrideFindOptions,
        });

        return {
            data,
            total: count,
        }
    }
    
    private async cursorPaginate<T extends BaseModel>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
        path: string,
    ) {
        const findOptions = this.composeFindOptions<T>(dto);

        const results = await repository.find({
            ...findOptions,
            ...overrideFindOptions,
        });

        const whereMoreThanName = 'where__id__more_than';
        const whereLessThanName = 'where__id__less_than';

        const lastItem = results.length > 0 && results.length === dto.take ? results[results.length - 1] : null;
    
        const protocol = this.configService.get<string>(ENV_PROTOCOL_KEY);
        const host = this.configService.get<string>(ENV_HOST_KEY);

        const nextURL = lastItem && new URL(`${protocol}://${host}/${path}`);
    
        if(nextURL) {
            for(const key of Object.keys(dto)) {
                if(dto[key]) {
                    if(key !== whereMoreThanName && key !== whereLessThanName) {
                        nextURL.searchParams.append(key, dto[key]);
                    } 
                }
            }
    
            let key: string | null = null;
    
            if(dto.order__createdAt === 'ASC') {
                key = whereMoreThanName;
            } else {
                key = whereLessThanName;
            }
    
            nextURL.searchParams.append(key, lastItem.id.toString());
        }

        return {
            data: results,
            cursor: {
                after: lastItem?.id ?? null,
            },
            count: results.length,
            next: nextURL?.toString() ?? null,
        }
    }

    private composeFindOptions<T extends BaseModel>(
        dto: BasePaginationDto,
    ) : FindManyOptions<T> {
        /**
         * where
         * order,
         * take,
         * skip -> page 기반일때만,
         */

        let where: FindOptionsWhere<T> = {};
        let order: FindOptionsOrder<T> = {};
        
        // dto를 plain object로 변환
        const plainDto = JSON.parse(JSON.stringify(dto));
        for(const [key, value] of Object.entries(plainDto)) {
            if(key.startsWith('where__')) {
                where = {
                    ...where,
                    ...this.parseWhereFilter(key, value),
                }
            } else if(key.startsWith('order__')) {
                order = {
                    ...order,
                    ...this.parseWhereFilter(key, value),
                }
            }
        }

        return {
            where,
            order,
            take: dto.take,
            skip: dto.page ? dto.take * (dto.page - 1) : undefined,
        }
    }

    private parseWhereFilter<T extends BaseModel>(key: string, value: any) : FindOptionsWhere<T> | FindOptionsOrder<T> {
        const options: FindOptionsWhere<T> = {};

        const split = key.split('__');

        if(split.length !== 2 && split.length !== 3) {
            throw new BadRequestException(
                `where 필터는 '__'로 split했을 때 길이가 2 또는 3이어야 합니다 - 문제되는 키값 : ${key}`
            );
        }

        if(split.length === 2) {
            const [_, field] = split;

            options[field] = value;
        } else {
            const [_, field, operator] = split;

            // const values = value.toString().split(',');

            // if(operator === 'between') {
            //     options[field] = FILTER_MAPPER[operator](values[0], values[1]);
            // } else {
            //     options[field] = FILTER_MAPPER[operator](value);
            // }
            if(operator === 'i_like') {
                options[field] = FILTER_MAPPER[operator](`%${value}%`);
            } else {
                options[field] = FILTER_MAPPER[operator](value);
            }
        }

        return options;
    }
}
