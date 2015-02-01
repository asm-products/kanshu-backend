# -*- coding: UTF-8 -*-

import codecs
import string
import re
from collections import namedtuple
import json
import sys
import getopt

def replace_punctuation_with_space(text):
    # Unicode ranges 1. symbols 2. japanese symbols 3. ascii punc, letters, numbers, symbols 4. fullwidth punctuation, numbers, letters.
    punctuation_ranges = [ur'[\u2000-\u206f]', ur'[\u3000-\u303f]', ur'[\u0020-\u00c0]', ur'[\uff00-\uffa0]']
    for punctuation_range in punctuation_ranges:
        text = re.sub(punctuation_range, ' ', text)
    return text


def write_json_from_file(filename, outfile, chinese_dictionary):
    wset = chinese_dictionary.keys()
    # sort wset so that longer words are preferred
    wset.sort(compare, reverse=True)

    f = codecs.open(filename, encoding='utf-8')
    text = f.read()
    nopunc = replace_punctuation_with_space(text)
    text_object = []
    lines = nopunc.splitlines()


    for i, line in enumerate(lines):
        puncline = text.splitlines()[i]
        line_object = []
        # split lines into phrases by spaces (these were spaces replaced by punctuation mainly)
        phrases = line.split()

        count = 0
        index = 0
        flag = True
        punc = []
        for i in range(len(phrases)+1):
            punc.append([])

        while(flag):
            space_index = line[index:].find(' ')
            print(index)
            print(space_index)
            print('\n')
            if(space_index < 0):
                break
            if(space_index != 0):
                count += 1
                punc[count].append(puncline[index:][space_index])
            else:
                try:
                    punc[count][0] += puncline[index:][space_index]
                except:
                    punc[count] += puncline[index:][space_index]
            index += space_index + 1


        for j, phrase in enumerate(phrases):
            line_object.append(['punc: ', punc[j]])
            if len(phrase) > 0:
                segments = segment(phrase, wset)
                if segments is not None:
                    for el in segments:
                        entry_object = []
                        entry = chinese_dictionary[el.encode('utf-8')]
                        for i in range(6):
                            if i == 2 or i == 5:
                                entry_object.append(entry[i])
                            else:
                                entry_object.append(entry[i].decode('utf-8'))
                        line_object.append(entry_object)
                        print(el.encode('utf-8') + ': ' + chinese_dictionary[el.encode('utf-8')].FirstDefinition)
                else:
                    print(phrase)
        line_object.append(['punc: ', punc[-1]])
        text_object.append(line_object)

    #return text_object
    with codecs.open(outfile, 'w', encoding='utf-8') as outfile:
        json.dump(text_object, outfile, indent=4, ensure_ascii=False)

    print('finished')

def get_HSK_dictionary():
    hsk_dictionary = {}

    for i in range(1,7):
        print(i)
        f = codecs.open('HSK' + str(i) + '.txt', encoding='utf-8')

        for line in f:
            splitTab = line.split('\t')

            simplified = splitTab[0][:]
            if simplified[0] == u'\ufeff':
                simplified = simplified[1:]

            hsk_dictionary[simplified.encode('utf-8')] = i

    return hsk_dictionary

def get_chinese_dictionary():
    hsk = get_HSK_dictionary()

    class Entry(namedtuple('Entry', ['Simplified', 'Traditional', 'Pronunciation', 'Definitions', 'FirstDefinition', 'HSK'])):
        def __new__(cls, Simplified=None, Traditional=None, Pronunciation=None, Definitions=None, FirstDefinition=None, HSK=0):
            return super(Entry, cls).__new__(cls, Simplified, Traditional, Pronunciation, Definitions, FirstDefinition, HSK)

    chinese_dictionary = {}

    #f = codecs.open('cc-cedict.txt', encoding='utf-8')
    lines = reversed(codecs.open("cc-cedict.txt", encoding="utf-8").readlines())

    # find pronunciation between []
    p = re.compile(r'\[(.*?)\]')

    for line in lines:
        if line[0] != "#":
            unicodeline = line.encode('utf-8')

            space_split = string.split(unicodeline)
            traditional = space_split[0]
            simplified = space_split[1]

            pronunciation = p.search(unicodeline).group()
            pinyin = prettify_pinyin(pronunciation[1:-1])

            slash_split = string.split(unicodeline,'/')
            firstdef = slash_split[1]
            pinyin_within_def = p.search(firstdef)
            if pinyin_within_def is not None:
                pinyin_within_def = pinyin_within_def.group()[1:-1]
                firstdef = re.sub(p, prettify_pinyin(pinyin_within_def).encode('utf-8'), firstdef)

            definitions = string.join(slash_split[1:-1], '; ')

            try:
                hsk_level = hsk[simplified]
            except:
                print(simplified)
                hsk_level = 7
            chinese_dictionary[simplified] = Entry(simplified, traditional, pinyin, definitions, firstdef, hsk_level)

    #f.close()
    return chinese_dictionary

def segment(string, wset):
    result = tokenize(string, wset, "")
    if result:
        result.pop()
        result.reverse()
        return result
    else:
        print("No possible segmentation")


def tokenize(string, wset, token):
    if string == '':
        return [token]
    for pref in wset:
        pref = pref.decode('utf-8')
        if string.startswith(pref):
            res = tokenize(string.replace(unicode(pref), u'', 1), wset, pref)
            if res:
                res.append(token)
                return res
    return False


def compare(item1, item2):
    """Comparison function to sort by length of characters"""
    if len(item1.decode('utf-8')) < len(item2.decode('utf-8')):
        return -1
    elif len(item1.decode('utf-8')) > len(item2.decode('utf-8')):
        return 1
    else:
        return 0


def prettify_pinyin(pinyin):
    replacements = {'a': [u'Ä', u'Ã¡', u'ÇŽ', u'Ã '], 'e': [u'Ä“', u'Ã©', u'Ä›', ur'Ã¨'], 'u': [u'Å«', u'Ãº', u'Ç”', u'Ã¹'], 'i': [u'Ä«', u'Ã­', u'Ç', u'Ã¬'], 'o': [u'Å', u'Ã³', u'Ç’', u'Ã²'], 'Ã¼': ['Ç–', 'Ç˜', 'Çš', 'Çœ']}
    medials = ['i', 'u', 'Ã¼']

    pinyin.replace('v', 'Ã¼')

    prettified = ''

    for syllable in pinyin.split():
        try:
            tone = int(syllable[-1])
        except:
            tone = 0

        if tone <= 0 or tone > 5:
            print('Error tone')
            syllable = ''
        elif tone == 5:
            syllable = syllable[0:-1]
            prettified += syllable
        else:
            for i in range(len(syllable)-1):
                current_letter = syllable[i]
                next_letter = syllable[i+1]

                if current_letter in replacements:
                    if(next_letter in replacements and current_letter in medials):
                        letter_to_replace = next_letter.lower()
                    else:
                        letter_to_replace = current_letter.lower()

                    syllable = unicode(syllable).replace(unicode(letter_to_replace), unicode(replacements[letter_to_replace][tone - 1]))
                    syllable = syllable[0:-1]
                    break
            prettified += syllable


    return prettified


def main(argv):
    inputfile = ''
    outputfile = ''
    try:
        opts, args = getopt.getopt(argv, "hi:o:", ["ifile=", "ofile="])
    except getopt.GetoptError:
        print 'test.py -i <inputfile> -o <outputfile>'
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print 'test.py -i <inputfile> -o <outputfile>'
            sys.exit()
        elif opt in ("-i", "--ifile"):
            inputfile = arg
        elif opt in ("-o", "--ofile"):
            outputfile = arg
    print 'Input file is "', inputfile
    print 'Output file is "', outputfile

    write_json_from_file(inputfile, outputfile, get_chinese_dictionary())


if __name__ == "__main__":
   main(sys.argv[1:])