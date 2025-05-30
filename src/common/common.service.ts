/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { BasePaginationDto } from './dto/base-pagination.dto';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { BaseModel } from './entity/base.entity';
import { FILTER_MAPPER } from './const/filter-mapper.const';
import { ConfigType } from '@nestjs/config';
import appConfig from 'src/configs/app.config';

/**
 * 공통 기능을 제공하는 서비스
 * 
 * 페이지네이션, 필터링 등의 공통 기능을 처리합니다.
 */
@Injectable()
export class CommonService {
    constructor(
        @Inject(appConfig.KEY)
        private readonly config: ConfigType<typeof appConfig>
    ){}

    /**
     * 페이지네이션 결과를 반환합니다
     * @param dto 페이지네이션 옵션
     * @param repository 대상 리포지토리
     * @param overrideFindOptions 추가 조회 옵션
     * @param path API 경로
     * @param additionalWhere 추가 조건
     * @returns 페이지 또는 커서 기반 페이지네이션 결과
     */
    paginate<T extends BaseModel, R>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
        path: string,
        additionalWhere?: FindOptionsWhere<T>,
      ): Promise<R> {
        if(dto.page) {
          return this.pagePaginate<T, R>(
            dto,
            repository,
            overrideFindOptions,
            additionalWhere,
          );
        } else {
          return this.cursorPaginate<T, R>(
            dto,
            repository,
            overrideFindOptions,
            path,
            additionalWhere,
          );
        }
    }

    /**
     * 페이지 번호 기반 페이지네이션 결과를 반환합니다
     * @param dto 페이지네이션 옵션
     * @param repository 대상 리포지토리
     * @param overrideFindOptions 추가 조회 옵션
     * @param additionalWhere 추가 조건
     * @returns 페이지 기반 페이지네이션 결과
     */
    private async pagePaginate<T extends BaseModel, R>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
        additionalWhere?: FindOptionsWhere<T>,
      ): Promise<R> {
        const findOptions = this.composeFindOptions<T>(dto, additionalWhere);
      
        const [data, count] = await repository.findAndCount({
          ...findOptions,
          ...overrideFindOptions,
        });
      
        // 여기서 반환하는 객체의 구조가 R과 일치한다고 가정합니다.
        return {
          data,
          total: count,
        } as unknown as R;
    }
    
    /**
     * 커서 기반 페이지네이션 결과를 반환합니다
     * @param dto 페이지네이션 옵션
     * @param repository 대상 리포지토리
     * @param overrideFindOptions 추가 조회 옵션
     * @param path API 경로
     * @param additionalWhere 추가 조건
     * @returns 커서 기반 페이지네이션 결과
     */
    private async cursorPaginate<T extends BaseModel, R>(
        dto: BasePaginationDto,
        repository: Repository<T>,
        overrideFindOptions: FindManyOptions<T> = {},
        path: string,
        additionalWhere?: FindOptionsWhere<T>,
      ): Promise<R> {
        const findOptions = this.composeFindOptions<T>(dto, additionalWhere);
      
        const results = await repository.find({
          ...findOptions,
          ...overrideFindOptions,
        });
      
        const whereMoreThanName = 'where__id__more_than';
        const whereLessThanName = 'where__id__less_than';
      
        const lastItem = results.length > 0 && results.length === dto.take ? results[results.length - 1] : null;
      
        const protocol = this.config.http.protocol;
        const host = this.config.http.host;
      
        const nextURL = lastItem && new URL(`${protocol}://${host}/${path}`);
      
        if (nextURL) {
          for (const key of Object.keys(dto)) {
            if (dto[key]) {
              if (key !== whereMoreThanName && key !== whereLessThanName) {
                nextURL.searchParams.append(key, dto[key]);
              }
            }
          }
      
          let key: string | null = null;
      
          if (dto.order__createdAt === 'ASC') {
            key = whereMoreThanName;
          } else {
            key = whereLessThanName;
          }
      
          nextURL.searchParams.append(key, lastItem.id.toString());
        }
      
        // 페이지 기반이 아닌 경우에는 이 구조로 반환하게 됩니다.
        return {
          data: results,
          cursor: {
            after: lastItem?.id ?? null,
          },
          count: results.length,
          next: nextURL?.toString() ?? null,
        } as unknown as R;
    }

    /**
     * 페이지네이션을 위한 조회 옵션을 구성합니다
     * @param dto 페이지네이션 옵션
     * @param additionalWhere 추가 조건
     * @returns 구성된 조회 옵션
     */
    private composeFindOptions<T extends BaseModel>(
        dto: BasePaginationDto,
        additionalWhere?: FindOptionsWhere<T>,
    ) : FindManyOptions<T> {
        /**
         * where
         * order,
         * take,
         * skip -> page 기반일때만,
         */

        let where: FindOptionsWhere<T> = additionalWhere ? { ...additionalWhere } : {};
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

    /**
     * 필터 키와 값을 파싱하여 TypeORM 조건으로 변환합니다
     * @param key 필터 키
     * @param value 필터 값
     * @returns TypeORM 조건 객체
     * @throws BadRequestException 필터 형식이 잘못된 경우
     */
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
