/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * 비밀번호 유효성 검사 파이프
 * 
 * @description 비밀번호가 8자 이하인지 확인하는 파이프입니다.
 */
@Injectable()
export class PasswordPipe implements PipeTransform {
    /**
     * 파이프 변환 메서드
     * 
     * @param value - 입력값
     * @param metadata - 메타데이터
     * @returns 변환된 문자열 값
     * @throws {BadRequestException} 비밀번호가 8자를 초과할 때
     */
    transform(value: any, metadata: ArgumentMetadata) {
        if(value.toString().length > 8) {
            throw new BadRequestException('비밀번호는 8자 이하로 입력해주세요!');
        }

        return value.toString();
    }
}

/**
 * 최대 길이 유효성 검사 파이프
 * 
 * @description 입력값이 지정된 최대 길이를 초과하지 않는지 확인합니다.
 */
@Injectable()
export class MaxLengthPipe implements PipeTransform {
    /**
     * 최대 길이 파이프 생성자
     * 
     * @param length - 허용되는 최대 길이
     * @param subject - 검사 대상의 이름 (오류 메시지에 사용)
     */
    constructor(private readonly length: number,
        private readonly subject: string,
    ) {}

    /**
     * 파이프 변환 메서드
     * 
     * @param value - 입력값
     * @param metadata - 메타데이터
     * @returns 변환된 문자열 값
     * @throws {BadRequestException} 입력값이 최대 길이를 초과할 때
     */
    transform(value: any, metadata: ArgumentMetadata) {
        if(value.toString().length > this.length) {
            throw new BadRequestException(`${this.subject}의 최대 길이는 ${this.length}입니다.`);
        }

        return value.toString();
    }
}

/**
 * 최소 길이 유효성 검사 파이프
 * 
 * @description 입력값이 지정된 최소 길이 이상인지 확인합니다.
 */
@Injectable()
export class MinLengthPipe implements PipeTransform {
    /**
     * 최소 길이 파이프 생성자
     * 
     * @param length - 요구되는 최소 길이
     * @param subject - 검사 대상의 이름 (오류 메시지에 사용)
     */
    constructor(private readonly length: number,
        private readonly subject: string,
    ) {}

    /**
     * 파이프 변환 메서드
     * 
     * @param value - 입력값
     * @param metadata - 메타데이터
     * @returns 변환된 문자열 값
     * @throws {BadRequestException} 입력값이 최소 길이 미만일 때
     */
    transform(value: any, metadata: ArgumentMetadata) {
        if(value.toString().length < this.length) {
            throw new BadRequestException(`${this.subject}의 최소 길이는 ${this.length}입니다.`);
        }

        return value.toString();
    }
}